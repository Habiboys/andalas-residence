<?php

namespace App\Actions\Billing;

use App\Enums\TagihanStatus;
use App\Models\LegacyResidenceRate;
use App\Models\PengajuanBebasAsrama;
use App\Models\Tagihan;
use App\Services\ResidenceLifecycle;
use Illuminate\Validation\ValidationException;

class CreateLegacyInvoice
{
    public function handle(PengajuanBebasAsrama $application): Tagihan
    {
        if ($application->tagihan_id) {
            return $application->tagihan;
        }
        $legacy = app(ResidenceLifecycle::class)->legacy($application->mahasiswa);
        if (! $legacy) {
            throw ValidationException::withMessages(['legacy' => 'Admin Layanan harus melengkapi arsip alumni dan gedung terlebih dahulu.']);
        }
        $rate = LegacyResidenceRate::where('angkatan', $legacy->angkatan)->where('gedung_id', $legacy->gedung_id)->first();
        if (! $rate) {
            throw ValidationException::withMessages(['legacy' => 'Tarif gedung dan angkatan belum ditetapkan.']);
        }
        $invoice = Tagihan::where('nomor', 'LEGACY-'.$legacy->id)->first() ?? app(CreateTagihan::class)->handle($application->mahasiswa, 'LEGACY-'.$legacy->id, [
            ['deskripsi' => 'Pelunasan asrama angkatan '.$legacy->angkatan, 'kuantitas' => 1, 'harga_satuan' => $rate->jumlah],
        ]);
        if ($invoice->status === TagihanStatus::Draft) {
            $invoice->update(['status' => TagihanStatus::Terbit, 'tanggal_terbit' => now(), 'residence_snapshot' => [
                'gedung_id' => $legacy->gedung_id, 'angkatan' => $legacy->angkatan, 'unit' => 'legacy', 'amount' => $rate->jumlah,
            ]]);
        }
        $application->update(['tagihan_id' => $invoice->id, 'legacy_resident_id' => $legacy->id]);

        return $invoice;
    }
}
