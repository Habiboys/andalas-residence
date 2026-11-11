<?php

namespace App\Services;

use App\Models\LaporanKerusakan;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class DamageReportAccess
{
    public static function global(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'staff_admin', 'admin_aset', 'admin_layanan', 'pimpinan']);
    }

    /** @return Builder<LaporanKerusakan> */
    public static function query(User $user): Builder
    {
        $query = LaporanKerusakan::query();
        if ($user->status !== 'aktif') {
            return $query->whereRaw('1 = 0');
        }
        if (self::global($user)) {
            return $query;
        }
        return $query->where(function (Builder $visible) use ($user): void {
            $visible->where('dilaporkan_oleh', $user->id);
            if ($user->hasRole('fasilitator')) {
                $ids = ResidenceBuildingAccess::ids($user);
                $visible->orWhereIn('gedung_id', $ids)
                    ->orWhereHas('kamar.lantai', fn (Builder $q) => $q->whereIn('gedung_id', $ids))
                    ->orWhereHas('aset.fasilitasUmum', fn (Builder $q) => $q->whereIn('gedung_id', $ids));
            }
            if ($user->hasRole('teknisi')) {
                $visible->orWhereNull('teknisi_id')->orWhere('teknisi_id', $user->id)
                    ->orWhereHas('assignments', fn (Builder $q) => $q->where('technician_id', $user->id)->whereNull('ended_at'));
            }
            if ($user->hasRole('mahasiswa') && $user->mahasiswaProfil?->status_huni === 'aktif') {
                foreach ($user->mahasiswaProfil->penempatanKamar()->where('status', 'aktif')->get() as $placement) {
                    $visible->orWhere(function (Builder $room) use ($placement): void {
                        $room->where('kamar_id', $placement->kamar_id)->where('tanggal_lapor', '>=', $placement->tanggal_mulai->startOfDay());
                    });
                    $visible->orWhere(function (Builder $facility) use ($placement): void {
                        $facility->whereNull('kamar_id')->whereNotNull('fasilitas_umum_id')->where('gedung_id', $placement->kamar->lantai->gedung_id)->where('tanggal_lapor', '>=', $placement->tanggal_mulai->startOfDay());
                    });
                }
            }
            if ($user->hasRole('go')) {
                $visible->orWhereHas('checkoutFinding.inspection', fn (Builder $q) => $q->where('inspector_id', $user->id));
            }
        });
    }

    public static function canView(User $user, LaporanKerusakan $report): bool
    {
        return self::query($user)->whereKey($report->id)->exists();
    }

    public static function canCoordinate(User $user, LaporanKerusakan $report): bool
    {
        return $user->status === 'aktif' && $user->hasAnyRole(['superadmin', 'admin', 'staff_admin', 'admin_aset', 'admin_layanan', 'fasilitator'])
            && self::canView($user, $report);
    }
}
