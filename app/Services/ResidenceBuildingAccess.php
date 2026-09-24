<?php

namespace App\Services;

use App\Models\FasilitatorWilayah;
use App\Models\User;

class ResidenceBuildingAccess
{
    /** @return array<int, string> */
    public static function ids(User $user): array
    {
        return FasilitatorWilayah::where('user_id', $user->id)->pluck('gedung_id')->filter()->values()->all();
    }

    public static function allows(User $user, ?string $buildingId): bool
    {
        return $user->hasRole('superadmin') || ($buildingId && in_array($buildingId, self::ids($user), true));
    }
}
