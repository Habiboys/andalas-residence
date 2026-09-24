<?php

namespace App\Actions\Attendance;

use App\Enums\AttendanceRejectionReason;
use App\Models\ActivityAttendance;
use App\Models\AttendanceAttempt;
use App\Models\AttendanceSession;
use App\Models\MahasiswaProfil;
use App\Services\AttendanceEligibility;
use App\Services\HaversineDistance;
use Illuminate\Support\Facades\DB;

class RecordAttendanceAttempt
{
    public function __construct(
        private HaversineDistance $distance,
        private AttendanceEligibility $eligibility,
    ) {}

    public function handle(
        AttendanceSession $session,
        MahasiswaProfil $student,
        string $token,
        float $latitude,
        float $longitude,
        float $accuracyMeters,
    ): AttendanceAttempt {
        return DB::transaction(function () use ($session, $student, $token, $latitude, $longitude, $accuracyMeters): AttendanceAttempt {
            $session = AttendanceSession::query()->lockForUpdate()->findOrFail($session->id);
            $now = now();
            $distanceMeters = $this->validCoordinates($latitude, $longitude)
                ? $this->distance->meters($session->anchor_latitude, $session->anchor_longitude, $latitude, $longitude)
                : null;

            $reason = match (true) {
                $session->closed_at !== null || $now->lt($session->opens_at) => AttendanceRejectionReason::SessionNotOpen,
                $now->gte($session->expires_at) => AttendanceRejectionReason::TokenExpired,
                ! hash_equals($session->qr_token_hash, hash('sha256', $token)) => AttendanceRejectionReason::TokenInvalid,
                ! $this->eligibility->isEligible($student, $now) => AttendanceRejectionReason::Ineligible,
                ! $session->kegiatan->allowsStudent($student) => AttendanceRejectionReason::WrongBuilding,
                ! $this->validCoordinates($latitude, $longitude) || ! is_finite($accuracyMeters) || $accuracyMeters < 0 || $accuracyMeters > $session->maximum_accuracy_meters => AttendanceRejectionReason::LocationInaccurate,
                $session->facilitator_located_at === null
                    || $session->facilitator_located_at->lt($now->copy()->subSeconds(60))
                    || $session->facilitator_accuracy_meters === null
                    || $session->facilitator_accuracy_meters > $session->maximum_accuracy_meters
                    || $session->facilitator_latitude === null || $session->facilitator_longitude === null
                    || $this->distance->meters($session->anchor_latitude, $session->anchor_longitude, $session->facilitator_latitude, $session->facilitator_longitude) > $session->radius_meters => AttendanceRejectionReason::FacilitatorUnavailable,
                $distanceMeters > $session->radius_meters => AttendanceRejectionReason::OutsideRadius,
                $session->attendances()->where('mahasiswa_id', $student->id)->exists() => AttendanceRejectionReason::Duplicate,
                default => null,
            };

            $attempt = AttendanceAttempt::create([
                'attendance_session_id' => $session->id,
                'mahasiswa_id' => $student->id,
                'attempted_at' => $now,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'accuracy_meters' => $accuracyMeters,
                'distance_meters' => $distanceMeters,
                'rejection_reason' => $reason,
            ]);

            if ($reason === null) {
                ActivityAttendance::create([
                    'attendance_session_id' => $session->id,
                    'mahasiswa_id' => $student->id,
                    'attendance_attempt_id' => $attempt->id,
                    'attended_at' => $now,
                ]);

            }

            return $attempt->refresh();
        });
    }

    private function validCoordinates(float $latitude, float $longitude): bool
    {
        return is_finite($latitude) && is_finite($longitude)
            && $latitude >= -90 && $latitude <= 90
            && $longitude >= -180 && $longitude <= 180;
    }
}
