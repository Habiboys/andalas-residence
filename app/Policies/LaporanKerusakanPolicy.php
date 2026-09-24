<?php

namespace App\Policies;

use App\Enums\LaporanKerusakanStatus;
use App\Models\LaporanKerusakan;
use App\Models\User;

class LaporanKerusakanPolicy
{
    public function create(User $user): bool
    {
        return $user->hasRole('mahasiswa')
            && $user->mahasiswaProfil?->status_huni === 'aktif'
            && $user->mahasiswaProfil->penempatanKamar()->where('status', 'aktif')->exists();
    }

    public function view(User $user, LaporanKerusakan $report): bool
    {
        return $report->dilaporkan_oleh === $user->id
            || $report->teknisi_id === $user->id
            || ($user->hasRole('teknisi') && $report->teknisi_id === null)
            || $user->hasRole('pimpinan')
            || $user->hasAnyRole(['superadmin', 'admin', 'staff_admin', 'admin_aset', 'fasilitator']);
    }

    public function triage(User $user, LaporanKerusakan $report): bool
    {
        return $report->status === LaporanKerusakanStatus::MenungguTriage
            && $user->hasAnyRole(['superadmin', 'admin', 'staff_admin', 'admin_aset', 'fasilitator']);
    }

    public function claim(User $user, LaporanKerusakan $report): bool
    {
        return $user->hasRole('teknisi')
            && in_array($report->status, [LaporanKerusakanStatus::MenungguTriage, LaporanKerusakanStatus::Didisposisikan], true)
            && ($report->teknisi_id === null || $report->teknisi_id === $user->id);
    }

    public function complete(User $user, LaporanKerusakan $report): bool
    {
        return $user->hasRole('teknisi')
            && $report->teknisi_id === $user->id
            && $report->status === LaporanKerusakanStatus::SedangDikerjakan;
    }
}
