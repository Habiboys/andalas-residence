<?php

namespace App\Services;

use App\Models\Kamar;
use App\Models\Pembayaran;
use App\Models\ResidenceRegistration;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class RoomReservations
{
    /** @return Builder<ResidenceRegistration> */
    public function held(): Builder
    {
        return ResidenceRegistration::whereNull('completed_at')->whereNotIn('status', ['rejected', 'draft'])
            ->whereNotNull('reserved_room_id')->where(function (Builder $query): void {
                $query->where('reservation_expires_at', '>', now())
                    ->orWhere(fn (Builder $new) => $new->where('workflow_version', 2)->whereNull('reservation_expires_at'))
                    ->orWhereIn('tagihan_id', Pembayaran::where('status', 'menunggu_verifikasi')->select('tagihan_id'))
                    ->orWhereHas('tagihan', fn (Builder $invoice) => $invoice->where('total_dibayar', '>', 0));
            });
    }

    public function count(Kamar $room, ?string $except = null): int
    {
        $held = $this->held()->where('reserved_room_id', $room->id)->when($except, fn (Builder $query) => $query->where('id', '!=', $except));
        $contract = $except ? ResidenceRegistration::find($except)?->room_contract_id : null;
        if ($contract) {
            $held->where(fn ($q) => $q->whereNull('room_contract_id')->orWhere('room_contract_id', '!=', $contract));
        }
        $heldRows = (clone $held)->lockForUpdate()->get(['id', 'billing_basis']);
        if ($heldRows->contains('billing_basis', 'room')) {
            return $room->kapasitas;
        }
        $exclusive = ResidenceRegistration::where('billing_basis', 'room')->when($contract, fn ($q) => $q->where(fn ($q) => $q->whereNull('room_contract_id')->orWhere('room_contract_id', '!=', $contract)))->whereHas('placement', fn (Builder $query) => $query->where('kamar_id', $room->id)->where('status', 'aktif'))->when($except, fn (Builder $query) => $query->where('id', '!=', $except))->lockForUpdate()->first(['id']);
        if ($exclusive) {
            return max(0, $room->kapasitas - count($room->penempatanKamar()->where('status', 'aktif')->lockForUpdate()->get(['id'])->all()));
        }

        return $heldRows->count();
    }

    public function expire(): void
    {
        ResidenceRegistration::whereNull('completed_at')->whereNotIn('status', ['rejected', 'draft'])
            ->where('reservation_expires_at', '<=', now())->whereNotIn('tagihan_id', Pembayaran::where('status', 'menunggu_verifikasi')->select('tagihan_id'))
            ->each(function (ResidenceRegistration $registration): void {
                DB::transaction(function () use ($registration): void {
                    $registration = ResidenceRegistration::query()->lockForUpdate()->findOrFail($registration->id);
                    $invoice = $registration->tagihan()->lockForUpdate()->first();
                    if ($registration->completed_at || ! $invoice || (float) $invoice->total_dibayar > 0
                        || Pembayaran::where('tagihan_id', $invoice->id)->where('status', 'menunggu_verifikasi')->exists()) {
                        return;
                    }
                    $registration->update(['status' => 'rejected', 'reserved_room_id' => null, 'notes' => 'Batas pembayaran reservasi telah berakhir.']);
                    $invoice->update(['status' => 'batal']);
                });
            });
    }
}
