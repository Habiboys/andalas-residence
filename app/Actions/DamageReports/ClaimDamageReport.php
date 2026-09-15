<?php

namespace App\Actions\DamageReports;

use App\Enums\LaporanKerusakanStatus;
use App\Models\LaporanKerusakan;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClaimDamageReport
{
    public function handle(LaporanKerusakan $report, User $technician): LaporanKerusakan
    {
        if (! $technician->can('claim', $report)) {
            throw new AuthorizationException;
        }

        return DB::transaction(function () use ($report, $technician) {
            $locked = LaporanKerusakan::query()->lockForUpdate()->findOrFail($report->id);

            if (($locked->teknisi_id !== null && $locked->teknisi_id !== $technician->id)
                || ! $locked->status->canTransitionTo(LaporanKerusakanStatus::SedangDikerjakan)) {
                throw ValidationException::withMessages(['status' => 'Laporan tidak tersedia untuk diklaim.']);
            }

            $wasUnassigned = $locked->teknisi_id === null;
            $locked->update(['teknisi_id' => $technician->id, 'status' => LaporanKerusakanStatus::SedangDikerjakan]);

            if ($wasUnassigned) {
                $locked->assignments()->create([
                    'technician_id' => $technician->id,
                    'assigned_by' => $technician->id,
                    'assigned_at' => now(),
                ]);
            }
            $locked->statusHistories()->create([
                'from_status' => LaporanKerusakanStatus::Didisposisikan,
                'to_status' => LaporanKerusakanStatus::SedangDikerjakan,
                'changed_by' => $technician->id,
                'description' => 'Diklaim teknisi.',
            ]);

            return $locked->fresh(['assignments', 'statusHistories']);
        });
    }
}
