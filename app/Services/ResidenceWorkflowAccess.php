<?php

namespace App\Services;

use App\Models\ResidenceRegistration;
use App\Models\User;

class ResidenceWorkflowAccess
{
    public static function manager(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'staff_admin', 'admin_layanan']);
    }

    public static function view(User $user, ResidenceRegistration $registration): bool
    {
        return self::manager($user) || $user->hasRole('pimpinan') || $user->can('pembayaran.verify')
            || $registration->studentProfile->user_id === $user->id
            || self::officer($user, $registration);
    }

    public static function officer(User $user, ResidenceRegistration $registration): bool
    {
        $building = $registration->reservedRoom?->lantai->gedung_id ?? $registration->placement?->kamar?->lantai->gedung_id;

        return self::manager($user) || ($user->hasRole('fasilitator') && ResidenceBuildingAccess::allows($user, $building));
    }
}
