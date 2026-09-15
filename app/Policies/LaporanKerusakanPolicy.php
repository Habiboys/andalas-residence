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
            || $user->hasAnyRole(['superadmin', 'admin', 'fasilitator']);
    }

    public function triage(User $user, LaporanKerusakan $report): bool
    {
        return $report->status === LaporanKerusakanStatus::MenungguTriage
            && $user->hasAnyRole(['superadmin', 'admin', 'fasilitator']);
    }

    public function claim(User $user, LaporanKerusakan $report): bool
    {
        return $user->hasRole('teknisi')
            && $report->status === LaporanKerusakanStatus::Didisposisikan
            && ($report->teknisi_id === null || $report->teknisi_id === $user->id);
    }

    public function complete(User $user, LaporanKerusakan $report): bool
    {
        return $user->hasRole('teknisi')
            && $report->teknisi_id === $user->id
            && $report->status === LaporanKerusakanStatus::SedangDikerjakan;
    }
}
