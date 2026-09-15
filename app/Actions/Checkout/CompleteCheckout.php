<?php

namespace App\Actions\Checkout;

use App\Enums\CheckoutRequestStatus;
use App\Enums\ClearanceStatus;
use App\Enums\RoomInspectionStatus;
use App\Models\CheckoutRequest;
use App\Models\Kamar;
use App\Models\PenempatanKamar;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompleteCheckout
{
    public function handle(CheckoutRequest $checkoutRequest): CheckoutRequest
    {
        return DB::transaction(function () use ($checkoutRequest): CheckoutRequest {
            $request = CheckoutRequest::query()
                ->with(['inspection', 'assetClearance', 'financeClearance'])
                ->lockForUpdate()
                ->findOrFail($checkoutRequest->id);

            if ($request->status === CheckoutRequestStatus::Selesai) {
                return $request;
            }

            if ($request->inspection?->status !== RoomInspectionStatus::Selesai
                || $request->assetClearance?->status !== ClearanceStatus::Disetujui
                || $request->financeClearance?->status !== ClearanceStatus::Disetujui
                || (float) $request->financeClearance->outstanding_amount > 0) {
                throw ValidationException::withMessages(['checkout' => 'Inspeksi, clearance aset, dan clearance keuangan harus selesai tanpa tunggakan.']);
            }

            $placement = PenempatanKamar::query()->lockForUpdate()->findOrFail($request->penempatan_kamar_id);
            $room = Kamar::query()->lockForUpdate()->findOrFail($placement->kamar_id);

            if ($placement->status !== 'aktif') {
                throw ValidationException::withMessages(['placement' => 'Penempatan kamar sudah tidak aktif.']);
            }

            $placement->update(['status' => 'berakhir', 'tanggal_selesai' => now()->toDateString()]);
            $request->mahasiswa()->update(['status_huni' => 'keluar']);

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

            $request->update(['status' => CheckoutRequestStatus::Selesai, 'selesai_at' => now()]);

            return $request->fresh(['placement.kamar', 'mahasiswa']);
        });
    }
}
