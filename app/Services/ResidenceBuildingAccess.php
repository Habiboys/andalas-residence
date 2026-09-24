<?php

namespace App\Services;

use App\Models\FasilitatorWilayah;
use App\Models\User;

class ResidenceBuildingAccess
{
    /** @return array<int, string> */
    public static function ids(User $user): array
    {
        return FasilitatorWilayah::with('lantai')->where('user_id', $user->id)->get()
            ->map(fn (FasilitatorWilayah $area): ?string => $area->gedung_id ?? $area->lantai?->gedung_id)
            ->filter()->unique()->values()->all();
    }

    public static function allows(User $user, ?string $buildingId): bool
    {
        return $user->hasRole('superadmin') || ($buildingId && in_array($buildingId, self::ids($user), true));
    }
}
