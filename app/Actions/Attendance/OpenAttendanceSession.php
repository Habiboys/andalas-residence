<?php

namespace App\Actions\Attendance;

use App\Models\AttendanceSession;
use App\Models\Kegiatan;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OpenAttendanceSession
{
    /** @return array{session: AttendanceSession, token: string} */
    public function handle(
        Kegiatan $activity,
        User $facilitator,
        CarbonInterface $expiresAt,
        float $latitude,
        float $longitude,
        int $radiusMeters,
        int $maximumAccuracyMeters,
        float $accuracyMeters = 0,
    ): array {
        $now = now();

        if ($expiresAt->lte($now)) {
            throw ValidationException::withMessages(['expires_at' => 'Batas waktu QR harus setelah waktu sekarang.']);
        }

        if ($now->lt($activity->tanggal_mulai) || $now->gt($activity->tanggal_selesai) || $expiresAt->gt($activity->tanggal_selesai)) {
            throw ValidationException::withMessages(['expires_at' => 'QR hanya dapat dibuka selama kegiatan berlangsung dan tidak boleh melewati akhir kegiatan.']);
        }

        if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
            throw new \InvalidArgumentException('Invalid anchor coordinates.');
        }

        if ($radiusMeters < 1 || $maximumAccuracyMeters < 1) {
            throw new \InvalidArgumentException('Radius and accuracy must be positive.');
        }

        if (! is_finite($accuracyMeters) || $accuracyMeters < 0 || $accuracyMeters > $maximumAccuracyMeters) {
            throw ValidationException::withMessages(['accuracy_meters' => 'Lokasi fasilitator belum cukup akurat. Ambil ulang lokasi.']);
        }

        $token = Str::random(64);
        $session = AttendanceSession::create([
            'kegiatan_id' => $activity->id,
            'facilitator_id' => $facilitator->id,
            'qr_token_hash' => hash('sha256', $token),
            'opens_at' => $now,
            'expires_at' => $expiresAt,
            'facilitator_latitude' => $latitude,
            'facilitator_longitude' => $longitude,
            'facilitator_accuracy_meters' => $accuracyMeters,
            'facilitator_located_at' => $now,
            'anchor_latitude' => $latitude,
            'anchor_longitude' => $longitude,
            'radius_meters' => $radiusMeters,
            'maximum_accuracy_meters' => $maximumAccuracyMeters,
        ]);

        return ['session' => $session, 'token' => $token];
    }
}
