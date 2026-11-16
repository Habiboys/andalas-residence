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
    public function held(?string $startsAt = null, ?string $endsAt = null): Builder
    {
        return ResidenceRegistration::whereNull('penempatan_kamar_id')
            ->whereNull('ended_at')
            ->whereNotIn('status', ['rejected', 'draft', 'cancelled'])
            ->whereNotNull('reserved_room_id')
            ->when($startsAt && $endsAt, function (Builder $query) use ($startsAt, $endsAt): void {
                $query->where(function (Builder $overlap) use ($startsAt, $endsAt): void {
                    $overlap->whereNull('starts_at')
                        ->orWhereNull('ends_at')
                        ->orWhere(function (Builder $range) use ($startsAt, $endsAt): void {
                            $range->whereDate('starts_at', '<', $endsAt)
                                ->whereDate('ends_at', '>', $startsAt);
                        });
                });
            })
            ->where(function (Builder $query): void {
                $query->where('reservation_expires_at', '>', now())
                    ->orWhere('allocation_status', 'admin_occupied')
                    ->orWhere(fn (Builder $new) => $new->where('workflow_version', 2)->whereNull('reservation_expires_at'))
                    ->orWhereIn('tagihan_id', Pembayaran::whereIn('status', ['menunggu_verifikasi', 'lunas'])->select('tagihan_id'))
                    ->orWhereHas('tagihan', fn (Builder $invoice) => $invoice->where('total_dibayar', '>', 0));
            });
    }

    public function count(Kamar $room, ?string $except = null, ?string $startsAt = null, ?string $endsAt = null): int
    {
        $exceptRegistration = $except ? ResidenceRegistration::find($except) : null;
        $startsAt ??= $exceptRegistration?->starts_at?->toDateString();
        $endsAt ??= $exceptRegistration?->ends_at?->toDateString();

        $held = $this->held($startsAt, $endsAt)
            ->where('reserved_room_id', $room->id)
            ->when($except, fn (Builder $query) => $query->where('id', '!=', $except));
        $contract = $exceptRegistration?->room_contract_id;
        if ($contract) {
            $held->where(fn ($q) => $q->whereNull('room_contract_id')->orWhere('room_contract_id', '!=', $contract));
        }
        $heldRows = (clone $held)->lockForUpdate()->get(['id', 'billing_basis']);
        if ($heldRows->contains('billing_basis', 'room')) {
            return $room->kapasitas;
        }
        $exclusive = ResidenceRegistration::where('billing_basis', 'room')
            ->when($contract, fn ($q) => $q->where(fn ($q) => $q->whereNull('room_contract_id')->orWhere('room_contract_id', '!=', $contract)))
            ->whereHas('placement', fn (Builder $query) => $query->where('kamar_id', $room->id)->where('status', 'aktif'))
            ->when($except, fn (Builder $query) => $query->where('id', '!=', $except))
            ->lockForUpdate()
            ->first(['id']);
        if ($exclusive) {
            return max(0, $room->kapasitas - count($room->penempatanKamar()->where('status', 'aktif')->lockForUpdate()->get(['id'])->all()));
        }

        return $heldRows->count();
    }

    public function expire(): void
    {
        ResidenceRegistration::whereNull('completed_at')
            ->whereNotIn('status', ['rejected', 'draft', 'cancelled'])
            ->where('is_kipk', false)
            ->where('funding', '!=', 'sponsor')
            ->where('stay_kind', '!=', 'summer_course')
            ->whereNotNull('reservation_expires_at')
            ->where('reservation_expires_at', '<=', now())
            ->whereNotIn('tagihan_id', Pembayaran::whereIn('status', ['menunggu_verifikasi', 'lunas'])->select('tagihan_id'))
            ->each(function (ResidenceRegistration $registration): void {
                DB::transaction(function () use ($registration): void {
                    $registration = ResidenceRegistration::query()->lockForUpdate()->findOrFail($registration->id);
                    $invoice = $registration->tagihan()->lockForUpdate()->first();
                    $hasDeferral = $registration->decisions()
                        ->where('kind', 'defer')
                        ->where('status', 'approved')
                        ->exists();
                    if ($registration->completed_at
                        || $hasDeferral
                        || ($invoice && (float) $invoice->total_dibayar > 0)
                        || ($invoice && Pembayaran::where('tagihan_id', $invoice->id)->whereIn('status', ['menunggu_verifikasi', 'lunas'])->exists())) {
                        return;
                    }
                    $registration->update([
                        'status' => 'rejected',
                        'allocation_status' => 'released',
                        'reserved_room_id' => null,
                        'notes' => 'Batas pembayaran reservasi telah berakhir.',
                    ]);
                    $invoice?->update(['status' => 'batal']);
                });
            });
    }
}
