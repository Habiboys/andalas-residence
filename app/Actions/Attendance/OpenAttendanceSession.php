<?php

namespace App\Actions\Attendance;

use App\Models\AttendanceSession;
use App\Models\Kegiatan;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Str;

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
    ): array {
        $now = now();

        if ($expiresAt->lte($now)) {
            throw new \InvalidArgumentException('Attendance expiry must be in the future.');
        }

        if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
            throw new \InvalidArgumentException('Invalid anchor coordinates.');
        }

        if ($radiusMeters < 1 || $maximumAccuracyMeters < 1) {
            throw new \InvalidArgumentException('Radius and accuracy must be positive.');
        }

        $token = Str::random(64);
        $session = AttendanceSession::create([
            'kegiatan_id' => $activity->id,
            'facilitator_id' => $facilitator->id,
            'qr_token_hash' => hash('sha256', $token),
            'opens_at' => $now,
            'expires_at' => $expiresAt,
            'anchor_latitude' => $latitude,
            'anchor_longitude' => $longitude,
            'radius_meters' => $radiusMeters,
            'maximum_accuracy_meters' => $maximumAccuracyMeters,
        ]);

        return ['session' => $session, 'token' => $token];
    }
}
