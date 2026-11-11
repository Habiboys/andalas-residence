<?php

namespace App\Policies;

use App\Enums\LaporanKerusakanStatus;
use App\Models\LaporanKerusakan;
use App\Models\User;
use App\Services\DamageReportAccess;

class LaporanKerusakanPolicy
{
    public function create(User $user): bool
    {
        return $user->status === 'aktif' && $user->hasRole('mahasiswa')
            && $user->mahasiswaProfil?->status_huni === 'aktif'
            && $user->mahasiswaProfil->penempatanKamar()->where('status', 'aktif')->exists();
    }

    public function view(User $user, LaporanKerusakan $report): bool
    {
        return DamageReportAccess::canView($user, $report);
    }

    public function triage(User $user, LaporanKerusakan $report): bool
    {
        return $report->status === LaporanKerusakanStatus::MenungguTriage
            && DamageReportAccess::canCoordinate($user, $report);
    }

    public function claim(User $user, LaporanKerusakan $report): bool
    {
        return $user->status === 'aktif' && $user->hasRole('teknisi')
            && in_array($report->status, [LaporanKerusakanStatus::MenungguTriage, LaporanKerusakanStatus::Didisposisikan, LaporanKerusakanStatus::SedangDikerjakan], true)
            && ($report->teknisi_id === null || $report->teknisi_id === $user->id);
    }

    public function complete(User $user, LaporanKerusakan $report): bool
    {
        return $user->status === 'aktif' && $user->hasRole('teknisi')
            && $report->teknisi_id === $user->id
            && in_array($report->status, [LaporanKerusakanStatus::SedangDikerjakan, LaporanKerusakanStatus::Selesai], true);
    }

    public function progress(User $user, LaporanKerusakan $report): bool
    {
        return $user->status === 'aktif' && $user->hasRole('teknisi') && $report->status === LaporanKerusakanStatus::SedangDikerjakan
            && ($report->teknisi_id === $user->id || $report->assignments()->where('technician_id', $user->id)->whereNull('ended_at')->exists());
    }

    public function team(User $user, LaporanKerusakan $report): bool
    {
        return $report->status === LaporanKerusakanStatus::SedangDikerjakan
            && ($this->complete($user, $report) || DamageReportAccess::canCoordinate($user, $report));
    }

    public function cancel(User $user, LaporanKerusakan $report): bool
    {
        return $user->status === 'aktif' && $user->hasAnyRole(['superadmin', 'admin', 'staff_admin', 'fasilitator'])
            && DamageReportAccess::canView($user, $report) && $report->status !== LaporanKerusakanStatus::Selesai;
    }

    public function confirm(User $user, LaporanKerusakan $report): bool
    {
        return $this->create($user) && $this->view($user, $report)
            && ! in_array($report->status, [LaporanKerusakanStatus::Selesai, LaporanKerusakanStatus::Dibatalkan], true);
    }

    public function linkAsset(User $user, LaporanKerusakan $report): bool
    {
        return DamageReportAccess::canCoordinate($user, $report)
            && ! in_array($report->status, [LaporanKerusakanStatus::Selesai, LaporanKerusakanStatus::Dibatalkan], true);
    }
}
