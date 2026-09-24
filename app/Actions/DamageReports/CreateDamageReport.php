<?php

namespace App\Actions\DamageReports;

use App\Enums\LaporanKerusakanStatus;
use App\Models\Aset;
use App\Models\LaporanKerusakan;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateDamageReport
{
    /** @param list<string> $photoPaths */
    public function handle(User $resident, string $description, array $photoPaths = [], ?string $assetId = null): LaporanKerusakan
    {
        if (! $resident->can('create', LaporanKerusakan::class)) {
            throw new AuthorizationException;
        }

        $placement = $resident->mahasiswaProfil->penempatanKamar()
            ->where('status', 'aktif')
            ->latest('tanggal_mulai')
            ->first();

        if ($placement === null || trim($description) === '') {
            throw ValidationException::withMessages(['deskripsi' => 'Deskripsi dan penempatan aktif wajib tersedia.']);
        }

        return DB::transaction(function () use ($resident, $description, $photoPaths, $assetId, $placement) {
            $asset = $assetId === null ? null : Aset::query()->reportableFor($placement->kamar)->lockForUpdate()->find($assetId);

            if ($assetId !== null && $asset === null) {
                throw ValidationException::withMessages(['aset_id' => 'Pilih barang di kamar Anda atau fasilitas umum gedung Anda yang masih digunakan.']);
            }

            $report = LaporanKerusakan::create([
                'nomor_tiket' => 'TKT-'.strtoupper(Str::random(8)),
                'aset_id' => $assetId,
                'kamar_id' => $asset === null ? $placement->kamar_id : $asset->kamar_id,
                'dilaporkan_oleh' => $resident->id,
                'deskripsi' => trim($description),
                'status' => LaporanKerusakanStatus::MenungguTriage,
                'tanggal_lapor' => now(),
            ]);

            foreach ($photoPaths as $path) {
                $this->assertPrivatePath($path);
                $report->photos()->create(['type' => 'before', 'path' => $path, 'uploaded_by' => $resident->id]);
            }

            $report->statusHistories()->create([
                'to_status' => LaporanKerusakanStatus::MenungguTriage,
                'changed_by' => $resident->id,
                'description' => 'Laporan dibuat.',
            ]);

            return $report->fresh(['photos', 'statusHistories']);
        });
    }

    private function assertPrivatePath(string $path): void
    {
        if ($path === '' || Str::startsWith($path, ['/', '\\', 'public/', 'http://', 'https://']) || str_contains($path, '..')) {
            throw ValidationException::withMessages(['photos' => 'Path foto harus relatif pada penyimpanan privat.']);
        }
    }
}
