<?php

namespace App\Services;

use App\Models\DocumentNumberSequence;
use Illuminate\Support\Facades\DB;

class DocumentNumber
{
    /**
     * Nomor surat resmi berurutan per tahun, misalnya SBA/UNAND/2026/0001.
     * Nomor yang diinput manual pada pengajuan tetap dipakai apa adanya.
     */
    public function next(string $tipe, ?string $prefix = null, ?int $year = null): string
    {
        $year ??= (int) now()->year;
        $prefix ??= $this->prefixFor($tipe);

        return DB::transaction(function () use ($tipe, $year, $prefix): string {
            DocumentNumberSequence::query()->firstOrCreate(
                ['tipe' => $tipe, 'tahun' => $year],
                ['nomor_terakhir' => 0],
            );

            $sequence = DocumentNumberSequence::query()
                ->where('tipe', $tipe)
                ->where('tahun', $year)
                ->lockForUpdate()
                ->firstOrFail();

            $sequence->increment('nomor_terakhir');

            return sprintf('%s/UNAND/%d/%04d', $prefix, $year, $sequence->nomor_terakhir);
        });
    }

    private function prefixFor(string $tipe): string
    {
        return match ($tipe) {
            'surat_bebas_asrama' => 'SBA',
            default => strtoupper(substr($tipe, 0, 3)),
        };
    }
}
