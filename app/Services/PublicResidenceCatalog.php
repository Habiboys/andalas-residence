<?php

namespace App\Services;

use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\ResidencePolicy;
use App\Models\ResidenceRate;

class PublicResidenceCatalog
{
    /** @return list<array<string, mixed>> */
    public function buildings(): array
    {
        $policies = ResidencePolicy::whereNotNull('published_at')->orderByDesc('version')->get()->unique('category');
        $holds = app(RoomReservations::class)->held()->get(['reserved_room_id', 'billing_basis'])->groupBy('reserved_room_id');
        $rates = ResidenceRate::all()->groupBy('gedung_id');
        return Gedung::with(['lantai.kamar.penempatanKamar' => fn ($q) => $q->where('status', 'aktif')->with('registration')])->orderBy('kode_gedung')->get()->map(function (Gedung $building) use ($policies, $holds, $rates): array {
            $rooms = $building->lantai->flatMap->kamar;
            $available = function (Kamar $room) use ($holds): int {
                if ($room->status === 'maintenance' || ! $room->lantai->booking_open || ! RoomEligibility::allowsType($room->lantai->gedung, $room->tipe_kamar, $room->kapasitas)) {
                    return 0;
                }
                $reserved = $holds->get($room->id);
                if ($reserved?->contains('billing_basis', 'room') || $room->penempatanKamar->contains(fn ($placement) => $placement->registration?->billing_basis === 'room')) {
                    return 0;
                }
                return max(0, $room->kapasitas - $room->penempatanKamar->count() - ($reserved?->count() ?? 0));
            };
            $offers = [];
            foreach ($policies as $policy) {
                if (! ($policy->settings['open'] ?? false) || ! in_array($building->id, $policy->settings['building_ids'], true)) {
                    continue;
                }
                $eligible = $rooms->filter(fn (Kamar $room) => $available($room) > 0 && collect($policy->settings['rates'])->contains(fn ($rate) => $rate['gedung_id'] === $building->id && $rate['type'] === $room->tipe_kamar));
                $floor = $eligible->sortBy(fn (Kamar $room) => [$room->lantai->booking_priority, $room->lantai->nomor_lantai, $room->lantai_id])->first()?->lantai_id;
                foreach ($policy->settings['rates'] as $rate) {
                    if ($rate['gedung_id'] !== $building->id) { continue; }
                    $matching = $rooms->where('tipe_kamar', $rate['type']);
                    if ($matching->isEmpty()) { continue; }
                    $places = $matching->where('lantai_id', $floor)->sum($available);
                    $offers[] = ['category' => $policy->category, 'type' => $rate['type'], 'unit' => $rate['unit'], 'amount' => (float) $rate['amount'], 'places' => $places];
                }
            }
            $roomTypes = $rooms->groupBy('tipe_kamar')->map(function ($typedRooms, $type) use ($rates, $building): array {
                $facilities = collect($building->room_types ?? [])->firstWhere('type', $type)['facilities'] ?? '';
                if (! $facilities) { $facilities = $rates->get($building->id)?->firstWhere('tipe_kamar', $type)?->facilities ?? ''; }
                return ['type' => $type, 'rooms' => $typedRooms->count(), 'capacity' => $typedRooms->max('kapasitas'), 'facilities' => $facilities];
            })->values()->all();
            return ['id' => $building->id, 'name' => $building->nama_gedung, 'code' => $building->kode_gedung, 'gender' => RoomEligibility::buildingGender($building), 'address' => $building->alamat, 'description' => strip_tags($building->deskripsi ?? ''), 'image' => $building->foto ? '/storage/'.$building->foto : null, 'floors' => $building->lantai->count(), 'rooms' => $rooms->count(), 'types' => $roomTypes, 'offers' => $offers];
        })->values()->all();
    }
}
