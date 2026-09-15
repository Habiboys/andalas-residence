<?php

namespace App\Actions\DamageReports;

use App\Enums\LaporanKerusakanStatus;
use App\Models\LaporanKerusakan;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CompleteDamageReport
{
    /** @param list<string> $evidencePaths */
    public function handle(LaporanKerusakan $report, User $technician, string $description, array $evidencePaths): LaporanKerusakan
    {
        if (! $technician->can('complete', $report)) {
            throw new AuthorizationException;
        }

        if (trim($description) === '' || $evidencePaths === []) {
            throw ValidationException::withMessages(['completion' => 'Deskripsi dan minimal satu bukti penyelesaian wajib diisi.']);
        }

        return DB::transaction(function () use ($report, $technician, $description, $evidencePaths) {
            $locked = LaporanKerusakan::query()->lockForUpdate()->findOrFail($report->id);

            if (! $locked->status->canTransitionTo(LaporanKerusakanStatus::Selesai)) {
                throw ValidationException::withMessages(['status' => 'Transisi status laporan tidak valid.']);
            }

            foreach ($evidencePaths as $path) {
                if ($path === '' || Str::startsWith($path, ['/', '\\', 'public/', 'http://', 'https://']) || str_contains($path, '..')) {
                    throw ValidationException::withMessages(['evidence' => 'Path bukti harus relatif pada penyimpanan privat.']);
                }

                $locked->photos()->create(['type' => 'after', 'path' => $path, 'uploaded_by' => $technician->id]);
            }

            $locked->update([
                'status' => LaporanKerusakanStatus::Selesai,
                'catatan_penyelesaian' => trim($description),
                'tanggal_selesai' => now(),
            ]);
            $locked->assignments()->whereNull('ended_at')->update(['ended_at' => now()]);
            $locked->statusHistories()->create([
                'from_status' => LaporanKerusakanStatus::SedangDikerjakan,
                'to_status' => LaporanKerusakanStatus::Selesai,
                'changed_by' => $technician->id,
                'description' => trim($description),
            ]);

            return $locked->fresh(['photos', 'assignments', 'statusHistories']);
        });
    }
}
