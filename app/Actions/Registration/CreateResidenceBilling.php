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

    private function invoiceNumberFor(ResidenceRegistration $r): string
    {
        $nim = trim((string) ($r->studentProfile->user->nim_nip ?? ''));
        $base = 'REG-'.($nim !== '' ? $nim : substr((string) $r->id, 0, 8));
        $base = substr($base, 0, 44);
        $candidate = $base;
        $suffix = 2;

        while (Tagihan::where('nomor', $candidate)->exists()) {
            $candidate = "{$base}-{$suffix}";
            $suffix++;
        }

        return $candidate;
    }

    /**
     * @return list<array{deskripsi: string, kuantitas: int, harga_satuan: float}>
     */
    public static function calculateStudentDailyTieredItems(string $label, int $days, float $dailyRate): array
    {
        $days = max(1, $days);
        if ($days <= 3) {
            return [
                ['deskripsi' => $label, 'kuantitas' => $days, 'harga_satuan' => $dailyRate],
            ];
        }

        $monthlyPackage = 250000.0;
        $fullMonths = intdiv($days, 30);
        $remainingDays = $days % 30;
        $items = [];

        if ($fullMonths > 0) {
            $items[] = [
                'deskripsi' => "{$label} (Paket 30 hari)",
                'kuantitas' => $fullMonths,
                'harga_satuan' => $monthlyPackage,
            ];
        }

        if ($remainingDays >= 1 && $remainingDays <= 3) {
            $items[] = [
                'deskripsi' => "{$label} ({$remainingDays} hari)",
                'kuantitas' => $remainingDays,
                'harga_satuan' => $dailyRate,
            ];
        } elseif ($remainingDays >= 4) {
            $items[] = [
                'deskripsi' => "{$label} (Paket {$remainingDays} hari · 4-30 hari)",
                'kuantitas' => 1,
                'harga_satuan' => $monthlyPackage,
            ];
        }

        return $items;
    }

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
        $category = app(ResidencePolicyService::class)->category($registration->studentProfile, $registration->stay_kind ?? 'regular');
        $rate = $room === null ? null : (ResidenceRate::where('gedung_id', $room->lantai->gedung_id)->where('tipe_kamar', $room->tipe_kamar)->where('unit', $rateUnit)->where('category', $category)->first()
            ?? ResidenceRate::where('gedung_id', $room->lantai->gedung_id)->where('tipe_kamar', $room->tipe_kamar)->where('unit', $rateUnit)->where('category', ResidenceRate::DEFAULT_CATEGORY)->first());
        $derivedSemesterFromYear = false;
        if (! $rate && $room && $rateUnit === 'semester') {
            $rate = ResidenceRate::where('gedung_id', $room->lantai->gedung_id)->where('tipe_kamar', $room->tipe_kamar)->where('unit', 'year')->where('category', $category)->first()
                ?? ResidenceRate::where('gedung_id', $room->lantai->gedung_id)->where('tipe_kamar', $room->tipe_kamar)->where('unit', 'year')->where('category', ResidenceRate::DEFAULT_CATEGORY)->first();
            $derivedSemesterFromYear = $rate !== null;
        }
        if (! $rate && $room && $rateUnit === 'day') {
            $rate = ResidenceRate::where('gedung_id', $room->lantai->gedung_id)->where('tipe_kamar', 'umum')->where('unit', 'day')->where('category', $category)->first()
                ?? ResidenceRate::where('gedung_id', $room->lantai->gedung_id)->where('tipe_kamar', 'umum')->where('unit', 'day')->where('category', ResidenceRate::DEFAULT_CATEGORY)->first();
        }
        $amount = $rate ? (float) $rate->amount : (in_array($registration->rate_unit, ['period', 'year'], true) && $room !== null ? (float) $room->tarif_per_periode : 0);
        if ($derivedSemesterFromYear) {
            $amount = round($amount / 2);
        }
        if ($registration->billing_basis === 'room') {
            if (! in_array($rateUnit, ['year', 'semester'], true) || ! $rate || (float) $rate->room_amount <= 0) {
                throw ValidationException::withMessages(['billing_basis' => 'Tarif per kamar belum tersedia untuk satuan ini.']);
            }
            $amount = $derivedSemesterFromYear ? round((float) $rate->room_amount / 2) : (float) $rate->room_amount;
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
        $baseLabel = 'Hunian '.($room?->lantai->gedung->nama_gedung ?? 'KIP-K menunggu penempatan').' / '.($room === null ? '-' : $room->nomor_kamar);
        $isStudentTieredDaily = $registration->rate_unit === 'day'
            && $registration->stay_kind === 'regular'
            && $registration->studentProfile->user->client_profile_category?->value !== 'non_student';
        $lineItems = $isStudentTieredDaily
            ? self::calculateStudentDailyTieredItems($baseLabel, $quantity, $amount)
            : [['deskripsi' => $baseLabel, 'kuantitas' => $quantity, 'harga_satuan' => $amount]];
        $lineTotal = (float) collect($lineItems)->sum(fn (array $item): float => (float) $item['kuantitas'] * (float) $item['harga_satuan']);
        $invoice = $this->createTagihan->handle($registration->studentProfile, $this->invoiceNumberFor($registration), $lineItems, $sponsored && $lineTotal > 0 ? [[
            'sumber' => $registration->is_kipk ? 'kipk_sponsor' : 'subsidi_internasional_gratis', 'deskripsi' => 'Ditanggung '.$registration->sponsor_name, 'jumlah' => -$lineTotal,
        ]] : []);
        $invoice->update([
            'status' => (float) $invoice->total === 0.0 ? TagihanStatus::Lunas : TagihanStatus::Terbit,
            'tanggal_terbit' => now(), 'jatuh_tempo' => $registration->reservation_expires_at,
            'sponsor_total' => $sponsored ? $lineTotal : 0, 'sponsor_name' => $registration->sponsor_name,
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
        if (in_array($r->billing_basis, ['room', 'group'], true)) {
            if (! $r->roomContract) {
                throw ValidationException::withMessages(['contract' => 'Sahkan anggota kontrak kamar sebelum membuat tagihan.']);
            }
            $members = $r->roomContract->members;
            $index = array_search($r->id, $members, true);
            if ($index === false) {
                throw ValidationException::withMessages(['contract' => 'Pendaftar bukan anggota kontrak.']);
            }
            $totalRupiah = (int) round((float) $r->roomContract->total);
            $shareRupiah = intdiv($totalRupiah, count($members)) + ($index < $totalRupiah % count($members) ? 1 : 0);
            $cents = $shareRupiah * 100;
            $quantity = 1;
        }
        $baseLabel = 'Hunian '.$room->lantai->gedung->nama_gedung.' / '.$room->nomor_kamar;
        $isStudentTieredDaily = $r->rate_unit === 'day'
            && $r->stay_kind === 'regular'
            && $r->policy?->category !== 'non_student'
            && ! in_array($r->billing_basis, ['room', 'group'], true);
        $lineItems = $isStudentTieredDaily
            ? self::calculateStudentDailyTieredItems($baseLabel, $quantity, $cents / 100)
            : [['deskripsi' => $baseLabel, 'kuantitas' => $quantity, 'harga_satuan' => $cents / 100]];
        $totalCents = $isStudentTieredDaily
            ? (int) round(collect($lineItems)->sum(fn (array $item): float => (float) $item['kuantitas'] * (float) $item['harga_satuan']) * 100)
            : $cents * $quantity;
        $sponsorCents = $r->funding === 'sponsor' ? min($totalCents, $r->sponsor_limit === null ? $totalCents : (int) round((float) $r->sponsor_limit * 100)) : 0;
        $invoice = $this->createTagihan->handle($r->studentProfile, $this->invoiceNumberFor($r), $lineItems, $sponsorCents > 0 ? [['sumber' => 'institution', 'deskripsi' => 'Tanggungan '.$r->sponsor_name, 'jumlah' => -$sponsorCents / 100]] : [], generateDocument: $r->stay_kind !== 'summer_course');
        $invoice->update([
            'status' => $totalCents === $sponsorCents ? TagihanStatus::Lunas : TagihanStatus::Terbit,
            'tanggal_terbit' => today(),
            'jatuh_tempo' => $r->reservation_expires_at?->timezone(config('residence.timezone', 'Asia/Jakarta'))->toDateString(),
            'amount_due_now' => $r->is_kipk ? 0 : null,
            'sponsor_total' => $sponsorCents / 100, 'sponsor_name' => $r->sponsor_name,
            'residence_snapshot' => ['building' => $room->lantai->gedung->nama_gedung, 'room' => $room->nomor_kamar, 'type' => $room->tipe_kamar,
                'starts_at' => $r->starts_at->toDateString(), 'ends_at' => $r->ends_at->toDateString(), 'unit' => $r->rate_unit,
                'quantity' => $quantity, 'amount' => $cents / 100, 'billing_basis' => $r->billing_basis,
                'policy_id' => $r->residence_policy_id, 'policy_version' => $r->policy->version, 'category' => $r->policy->category,
                'receivable_type' => $r->is_kipk ? 'kipk_scholarship' : ($r->funding === 'sponsor' ? 'sponsor' : 'personal'),
                'room_contract_id' => $r->room_contract_id],
        ]);
        $r->update(['tagihan_id' => $invoice->id]);

        return $invoice;
    }
}
