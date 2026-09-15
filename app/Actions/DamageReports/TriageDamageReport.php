<?php

namespace App\Actions\DamageReports;

use App\Enums\LaporanKerusakanStatus;
use App\Models\LaporanKerusakan;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TriageDamageReport
{
    public function handle(LaporanKerusakan $report, User $actor, ?User $technician = null, ?string $description = null): LaporanKerusakan
    {
        if (! $actor->can('triage', $report)) {
            throw new AuthorizationException;
        }

        if ($technician !== null && ! $technician->hasRole('teknisi')) {
            throw ValidationException::withMessages(['teknisi_id' => 'Petugas yang ditunjuk harus teknisi.']);
        }

        return DB::transaction(function () use ($report, $actor, $technician, $description) {
            $locked = LaporanKerusakan::query()->lockForUpdate()->findOrFail($report->id);
            $this->transition($locked, LaporanKerusakanStatus::Didisposisikan);

            if ($technician !== null) {
                $locked->update(['teknisi_id' => $technician->id]);
                $locked->assignments()->create([
                    'technician_id' => $technician->id,
                    'assigned_by' => $actor->id,
                    'assigned_at' => now(),
                ]);
            }

            $locked->statusHistories()->create([
                'from_status' => LaporanKerusakanStatus::MenungguTriage,
                'to_status' => LaporanKerusakanStatus::Didisposisikan,
                'changed_by' => $actor->id,
                'description' => $description,
            ]);

            return $locked->fresh(['assignments', 'statusHistories']);
        });
    }

    private function transition(LaporanKerusakan $report, LaporanKerusakanStatus $to): void
    {
        if (! $report->status->canTransitionTo($to)) {
            throw ValidationException::withMessages(['status' => 'Transisi status laporan tidak valid.']);
        }

        $report->update(['status' => $to]);
    }
}
