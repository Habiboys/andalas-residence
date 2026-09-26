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

        $sequence = DB::transaction(function () use ($tipe, $year): DocumentNumberSequence {
            $sequence = DocumentNumberSequence::query()->firstOrCreate(
                ['tipe' => $tipe, 'tahun' => $year],
                ['nomor_terakhir' => 0],
            );

            return DocumentNumberSequence::query()
                ->whereKey($sequence->getKey())
                ->lockForUpdate()
                ->firstOrFail();
        });

        $sequence->increment('nomor_terakhir');
        $next = $sequence->fresh()->nomor_terakhir;

        return sprintf('%s/UNAND/%d/%04d', $prefix, $year, $next);
    }

    private function prefixFor(string $tipe): string
    {
        return match ($tipe) {
            'surat_bebas_asrama' => 'SBA',
            default => strtoupper(substr($tipe, 0, 3)),
        };
    }
}
