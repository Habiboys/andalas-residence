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
                    ->orWhereIn('tagihan_id', Pembayaran::where('status', 'menunggu_verifikasi')->select('tagihan_id'))
                    ->orWhereHas('tagihan', fn (Builder $invoice) => $invoice->where('total_dibayar', '>', 0));
            });
    }

    public function count(Kamar $room, ?string $except = null): int
    {
        return $this->held()->where('reserved_room_id', $room->id)->when($except, fn (Builder $query) => $query->where('id', '!=', $except))->count();
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
