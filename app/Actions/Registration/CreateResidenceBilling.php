<?php

namespace App\Actions\Registration;

use App\Actions\Billing\CreateTagihan;
use App\Enums\TagihanStatus;
use App\Models\Kamar;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Models\Tagihan;
use App\Services\ResidencePolicyService;
use Illuminate\Validation\ValidationException;

class CreateResidenceBilling
{
    public function __construct(private CreateTagihan $createTagihan) {}

    public function handle(ResidenceRegistration $registration): Tagihan
    {
        if ($registration->tagihan_id) {
            return $registration->tagihan;
        }
        if ($registration->workflow_version === 2) {
            return $this->createVersioned($registration);
        }
        $room = $registration->reserved_room_id ? Kamar::with('lantai.gedung')->findOrFail($registration->reserved_room_id) : null;
        if (! $room && $registration->funding !== 'sponsor') {
            throw ValidationException::withMessages(['kamar_id' => 'Tentukan kamar sebelum menerbitkan tagihan pembayaran pribadi.']);
        }
        $rateUnit = in_array($registration->rate_unit, ['period', 'year'], true) ? 'year' : $registration->rate_unit;
        $rate = $room === null ? null : ResidenceRate::where('gedung_id', $room->lantai->gedung_id)->where('tipe_kamar', $room->tipe_kamar)->where('unit', $rateUnit)->first();
        if (! $rate && $room && $rateUnit === 'day') {
            $rate = ResidenceRate::where('gedung_id', $room->lantai->gedung_id)->where('tipe_kamar', 'umum')->where('unit', 'day')->first();
        }
        $amount = $rate ? (float) $rate->amount : (in_array($registration->rate_unit, ['period', 'year'], true) && $room !== null ? (float) $room->tarif_per_periode : 0);
        if ($registration->billing_basis === 'room') {
            if ($rateUnit !== 'year' || ! $rate || (float) $rate->room_amount <= 0) {
                throw ValidationException::withMessages(['billing_basis' => 'Tarif tahunan per kamar belum tersedia.']);
            }
            $amount = (float) $rate->room_amount;
        }
        if ($rate && $rateUnit === 'day' && $registration->studentProfile->user->client_profile_category?->value !== 'non_student' && $rate->student_amount !== null) {
            $amount = (float) $rate->student_amount;
        }
        if ($room && $amount <= 0) {
            throw ValidationException::withMessages([$registration->is_kipk ? 'kamar_id' : 'preferences' => 'Tarif gedung, tipe kamar, dan satuan belum ditetapkan.']);
        }
        $quantity = match ($registration->rate_unit) {
            'day' => max(1, (int) $registration->starts_at->diffInDays($registration->ends_at)),
            'month' => max(1, (int) ceil($registration->starts_at->diffInDays($registration->ends_at) / 30)),
            default => 1,
        };
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
                'unit' => $registration->rate_unit, 'billing_basis' => $registration->billing_basis ?? 'person', 'quantity' => $quantity, 'amount' => $amount, 'category' => $registration->is_kipk ? 'kipk' : 'non_kipk'],
        ]);
        $registration->update(['tagihan_id' => $invoice->id]);

        return $invoice;
    }

    private function createVersioned(ResidenceRegistration $r): Tagihan
    {
        $room = $r->reservedRoom;
        if (! $room) {
            throw ValidationException::withMessages(['kamar_id' => 'Alokasikan kamar sebelum menerbitkan tagihan.']);
        }
        $rate = app(ResidencePolicyService::class)->rate($r, $room);
        $days = max(1, (int) $r->starts_at->diffInDays($r->ends_at));
        $quantity = match ($r->rate_unit) {
            'day' => $days + (($r->policy->settings['day_basis'] ?? 'nights') === 'inclusive_days' ? 1 : 0),
            'month' => max(1, (int) ceil($days / $r->policy->settings['month_days'])),
            default => 1,
        };
        $cents = (int) round((float) $rate['amount'] * 100);
        if ($r->billing_basis === 'room') {
            if (! $r->roomContract) {
                throw ValidationException::withMessages(['contract' => 'Sahkan anggota kontrak kamar sebelum membuat tagihan.']);
            }
            $members = $r->roomContract->members;
            $index = array_search($r->id, $members, true);
            if ($index === false) {
                throw ValidationException::withMessages(['contract' => 'Pendaftar bukan anggota kontrak.']);
            }
            $total = (int) round((float) $r->roomContract->total * 100);
            $cents = intdiv($total, count($members)) + ($index < $total % count($members) ? 1 : 0);
            $quantity = 1;
        }
        $totalCents = $cents * $quantity;
        $sponsorCents = $r->funding === 'sponsor' ? min($totalCents, $r->sponsor_limit === null ? $totalCents : (int) round((float) $r->sponsor_limit * 100)) : 0;
        $invoice = $this->createTagihan->handle($r->studentProfile, 'REG-'.$r->id, [
            ['deskripsi' => 'Hunian '.$room->lantai->gedung->nama_gedung.' / '.$room->nomor_kamar, 'kuantitas' => $quantity, 'harga_satuan' => $cents / 100],
        ], $sponsorCents > 0 ? [['sumber' => 'institution', 'deskripsi' => 'Tanggungan '.$r->sponsor_name, 'jumlah' => -$sponsorCents / 100]] : [], generateDocument: $r->stay_kind !== 'summer_course');
        $invoice->update([
            'status' => $totalCents === $sponsorCents ? TagihanStatus::Lunas : TagihanStatus::Terbit,
            'tanggal_terbit' => today(), 'sponsor_total' => $sponsorCents / 100, 'sponsor_name' => $r->sponsor_name,
            'residence_snapshot' => ['building' => $room->lantai->gedung->nama_gedung, 'room' => $room->nomor_kamar, 'type' => $room->tipe_kamar,
                'starts_at' => $r->starts_at->toDateString(), 'ends_at' => $r->ends_at->toDateString(), 'unit' => $r->rate_unit,
                'quantity' => $quantity, 'amount' => $cents / 100, 'billing_basis' => $r->billing_basis,
                'policy_id' => $r->residence_policy_id, 'policy_version' => $r->policy->version, 'category' => $r->policy->category,
                'room_contract_id' => $r->room_contract_id],
        ]);
        $r->update(['tagihan_id' => $invoice->id]);

        return $invoice;
    }
}
