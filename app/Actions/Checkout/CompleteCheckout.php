<?php

namespace App\Actions\Checkout;

use App\Enums\CheckoutRequestStatus;
use App\Enums\ResidenceEvent;
use App\Enums\RoomInspectionStatus;
use App\Models\Aset;
use App\Models\CheckoutRequest;
use App\Models\Kamar;
use App\Models\PenempatanKamar;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompleteCheckout
{
    public function handle(CheckoutRequest $checkoutRequest, ?string $officerId = null): CheckoutRequest
    {
        return DB::transaction(function () use ($checkoutRequest, $officerId): CheckoutRequest {
            $request = CheckoutRequest::query()
                ->with(['inspection'])
                ->lockForUpdate()
                ->findOrFail($checkoutRequest->id);

            if ($request->status === CheckoutRequestStatus::Selesai) {
                return $request;
            }

            if ($request->status === CheckoutRequestStatus::Ditolak) {
                throw ValidationException::withMessages(['checkout' => 'Pengajuan yang ditolak tidak dapat diselesaikan.']);
            }

            if ($request->inspection?->status !== RoomInspectionStatus::Selesai) {
                throw ValidationException::withMessages(['checkout' => 'GO harus menyelesaikan pemeriksaan kondisi kamar sebelum fasilitator menyelesaikan checkout.']);
            }

            $placement = PenempatanKamar::query()->lockForUpdate()->findOrFail($request->penempatan_kamar_id);
            $room = Kamar::query()->lockForUpdate()->findOrFail($placement->kamar_id);
            $expectedAssetIds = Aset::query()->where('kamar_id', $room->id)->pluck('id')->sort()->values()->all();
            $checkedAssetIds = collect($request->inspection->asset_checks ?? [])->pluck('aset_id')->sort()->values()->all();
            if ($expectedAssetIds !== $checkedAssetIds) {
                throw ValidationException::withMessages(['checkout' => 'Hasil hitung seluruh aset kamar belum lengkap.']);
            }

            if ($placement->status !== 'aktif') {
                throw ValidationException::withMessages(['placement' => 'Penempatan kamar sudah tidak aktif.']);
            }

            $placement->update(['status' => 'berakhir', 'tanggal_selesai' => now()->toDateString()]);
            $request->mahasiswa()->update(['status_huni' => 'keluar']);
            $request->mahasiswa->residenceHistories()->create(['event' => ResidenceEvent::CheckedOut, 'occurred_at' => now()]);

            $activeOccupants = PenempatanKamar::query()
                ->whereBelongsTo($room, 'kamar')
                ->where('status', 'aktif')
                ->count();

            if ($room->status !== 'maintenance') {
                $room->update(['status' => match (true) {
                    $activeOccupants === 0 => 'kosong',
                    $activeOccupants >= $room->kapasitas => 'penuh',
                    default => 'terisi_sebagian',
                }]);
            }

            $request->update(['status' => CheckoutRequestStatus::Selesai, 'selesai_at' => now(), 'diproses_oleh' => $officerId]);

            return $request->fresh(['placement.kamar', 'mahasiswa']);
        });
    }
}
