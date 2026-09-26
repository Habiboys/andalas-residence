<?php

namespace App\Actions\Registration;

use App\Actions\Billing\CreateTagihan;
use App\Enums\TagihanStatus;
use App\Models\Kamar;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Models\Tagihan;
use Illuminate\Validation\ValidationException;

class CreateResidenceBilling
{
    public function __construct(private CreateTagihan $createTagihan) {}

    public function handle(ResidenceRegistration $registration): Tagihan
    {
        if ($registration->tagihan_id) {
            return $registration->tagihan;
        }
        $room = $registration->reserved_room_id ? Kamar::with('lantai.gedung')->findOrFail($registration->reserved_room_id) : null;
        $rate = $room === null ? null : ResidenceRate::where('gedung_id', $room->lantai->gedung_id)->where('tipe_kamar', $room->tipe_kamar)->where('unit', $registration->rate_unit)->first();
        $amount = $rate ? (float) $rate->amount : ($registration->rate_unit === 'period' && $room !== null ? (float) $room->tarif_per_periode : 0);
        if ($room && $amount <= 0) {
            throw ValidationException::withMessages(['preferences' => 'Tarif gedung, tipe kamar, dan satuan belum ditetapkan.']);
        }
        $quantity = $registration->rate_unit === 'day' ? max(1, (int) $registration->starts_at->diffInDays($registration->ends_at)) : 1;
        $sponsored = $registration->funding === 'sponsor';
        $invoice = $this->createTagihan->handle($registration->studentProfile, 'REG-'.$registration->id, [
            ['deskripsi' => 'Hunian '.($room?->lantai->gedung->nama_gedung ?? 'KIP-K menunggu penempatan').' / '.($room === null ? '-' : $room->nomor_kamar), 'kuantitas' => $quantity, 'harga_satuan' => $amount],
        ], $sponsored && $amount > 0 ? [[
            'sumber' => $registration->is_kipk ? 'kipk_sponsor' : 'subsidi_internasional_gratis', 'deskripsi' => 'Ditanggung '.$registration->sponsor_name, 'jumlah' => -$amount * $quantity,
        ]] : []);
        $invoice->update([
            'status' => (float) $invoice->total === 0.0 ? TagihanStatus::Lunas : TagihanStatus::Terbit,
            'tanggal_terbit' => now(), 'jatuh_tempo' => $registration->reservation_expires_at,
            'sponsor_total' => $sponsored ? $amount * $quantity : 0, 'sponsor_name' => $registration->sponsor_name,
            'residence_snapshot' => ['building' => $room?->lantai->gedung->nama_gedung, 'room' => $room?->nomor_kamar, 'type' => $room?->tipe_kamar,
                'starts_at' => $registration->starts_at?->toDateString(), 'ends_at' => $registration->ends_at?->toDateString(),
                'unit' => $registration->rate_unit, 'quantity' => $quantity, 'amount' => $amount, 'category' => $registration->is_kipk ? 'kipk' : 'non_kipk'],
        ]);
        $registration->update(['tagihan_id' => $invoice->id]);

        return $invoice;
    }
}
