<?php

namespace App\Actions\Checkout;

use App\Enums\CheckoutRequestStatus;
use App\Models\CheckoutRequest;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateCheckoutRequest
{
    public function handle(MahasiswaProfil $mahasiswa, ?string $reason = null): CheckoutRequest
    {
        return DB::transaction(function () use ($mahasiswa, $reason): CheckoutRequest {
            $mahasiswa = MahasiswaProfil::query()->lockForUpdate()->findOrFail($mahasiswa->id);
            if ($mahasiswa->status_huni !== 'aktif') {
                throw ValidationException::withMessages(['placement' => 'Checkout hanya tersedia setelah pendaftaran hunian selesai.']);
            }

            $placement = PenempatanKamar::query()
                ->whereBelongsTo($mahasiswa, 'mahasiswa')
                ->where('status', 'aktif')
                ->latest('tanggal_mulai')
                ->first();

            if (! $placement) {
                throw ValidationException::withMessages(['placement' => 'Mahasiswa tidak memiliki penempatan aktif.']);
            }

            $existing = CheckoutRequest::query()
                ->whereBelongsTo($placement, 'placement')
                ->whereNotIn('status', [CheckoutRequestStatus::Selesai, CheckoutRequestStatus::Ditolak])
                ->first();

            if ($existing) {
                return $existing;
            }

            $request = CheckoutRequest::create([
                'mahasiswa_id' => $mahasiswa->id,
                'penempatan_kamar_id' => $placement->id,
                'status' => CheckoutRequestStatus::Diajukan,
                'alasan' => $reason,
                'diajukan_at' => now(),
            ]);

            $request->inspection()->create([]);

            return $request->load(['inspection']);
        });
    }
}
