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

        return array_values(Gedung::with(['lantai.kamar.lantai.gedung', 'lantai.kamar.penempatanKamar' => fn ($q) => $q->where('status', 'aktif')->with('registration')])->orderBy('kode_gedung')->get()->map(function (Gedung $building) use ($policies, $holds, $rates): array {
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
            $buildingMasterRates = $rates->get($building->id, collect());
            foreach ($policies as $policy) {
                if (! ($policy->settings['open'] ?? false) || ! in_array($building->id, $policy->settings['building_ids'], true)) {
                    continue;
                }
                $policyBuildingRates = collect($policy->settings['rates'])->where('gedung_id', $building->id)->values();
                $eligible = $rooms->filter(fn (Kamar $room) => $available($room) > 0 && $policyBuildingRates->contains(fn ($rate) => $rate['type'] === $room->tipe_kamar));
                $floor = $eligible->sortBy(fn (Kamar $room) => [$room->lantai->booking_priority, $room->lantai->nomor_lantai, $room->lantai_id])->first()?->lantai_id;

                $seenKeys = [];
                $yearOfferByType = [];
                $placesByType = [];

                foreach ($policyBuildingRates as $rate) {
                    $matching = $rooms->where('tipe_kamar', $rate['type']);
                    if ($matching->isEmpty()) {
                        continue;
                    }
                    $places = $matching->where('lantai_id', $floor)->sum($available);
                    $placesByType[$rate['type']] = $places;
                    $amount = (float) $rate['amount'];
                    $roomAmount = isset($rate['room_amount']) && (float) $rate['room_amount'] > 0
                        ? (float) $rate['room_amount']
                        : null;

                    $key = $rate['type'].'|'.$rate['unit'];
                    $seenKeys[$key] = true;
                    if ($rate['unit'] === 'year' && $amount > 0) {
                        $yearOfferByType[$rate['type']] = ['amount' => $amount, 'room_amount' => $roomAmount, 'places' => $places];
                    }

                    $offers[] = [
                        'category' => $policy->category,
                        'type' => $rate['type'],
                        'unit' => $rate['unit'],
                        'amount' => $amount,
                        'room_amount' => $roomAmount,
                        'places' => $places,
                    ];
                }

                // Supplement missing units (day/month/semester/year) from master ResidenceRate when available for this building & category.
                $allowedUnits = match ($policy->category) {
                    'local_kipk' => ['year'],
                    'summer_course' => ['day'],
                    default => ResidencePolicyService::RATE_UNITS,
                };
                foreach ($placesByType as $type => $places) {
                    $typeMasterRates = $buildingMasterRates->where('tipe_kamar', $type);
                    foreach ($allowedUnits as $unit) {
                        $key = $type.'|'.$unit;
                        if (isset($seenKeys[$key])) {
                            continue;
                        }
                        $specific = $typeMasterRates->first(fn (ResidenceRate $r): bool => $r->unit === $unit && $r->category === $policy->category);
                        $default = $typeMasterRates->first(fn (ResidenceRate $r): bool => $r->unit === $unit && $r->category === ResidenceRate::DEFAULT_CATEGORY);
                        $chosen = $specific ?? $default;
                        if ($chosen) {
                            $amount = $specific === null && $policy->category !== 'non_student' && $unit === 'day' && $chosen->student_amount !== null
                                ? (float) $chosen->student_amount
                                : (float) $chosen->amount;
                            $roomAmount = $chosen->room_amount !== null && (float) $chosen->room_amount > 0
                                ? (float) $chosen->room_amount
                                : null;
                            if ($amount > 0) {
                                $seenKeys[$key] = true;
                                if ($unit === 'year') {
                                    $yearOfferByType[$type] = ['amount' => $amount, 'room_amount' => $roomAmount, 'places' => $places];
                                }
                                $offers[] = [
                                    'category' => $policy->category,
                                    'type' => $type,
                                    'unit' => $unit,
                                    'amount' => $amount,
                                    'room_amount' => $roomAmount,
                                    'places' => $places,
                                ];
                            }
                        }
                    }

                    // Always derive 6-month (semester) rate as half of yearly rate if not explicitly configured.
                    if (in_array('semester', $allowedUnits, true) && ! isset($seenKeys[$type.'|semester']) && isset($yearOfferByType[$type])) {
                        $yearOffer = $yearOfferByType[$type];
                        $seenKeys[$type.'|semester'] = true;
                        $offers[] = [
                            'category' => $policy->category,
                            'type' => $type,
                            'unit' => 'semester',
                            'amount' => round($yearOffer['amount'] / 2),
                            'room_amount' => $yearOffer['room_amount'] !== null ? round($yearOffer['room_amount'] / 2) : null,
                            'places' => $yearOffer['places'],
                        ];
                    }
                }
            }
            $roomTypes = $rooms->groupBy('tipe_kamar')->map(function ($typedRooms, $type) use ($rates, $building): array {
                $facilities = collect($building->room_types ?? [])->firstWhere('type', $type)['facilities'] ?? '';
                if (! $facilities) {
                    $facilities = $rates->get($building->id)?->firstWhere('tipe_kamar', $type)->facilities ?? '';
                }

                return ['type' => $type, 'rooms' => $typedRooms->count(), 'capacity' => $typedRooms->max('kapasitas'), 'facilities' => $facilities];
            })->values()->all();

            return ['id' => $building->id, 'name' => $building->nama_gedung, 'code' => $building->kode_gedung, 'gender' => RoomEligibility::buildingGender($building), 'address' => $building->alamat, 'description' => strip_tags($building->deskripsi ?? ''), 'image' => $building->foto ? '/storage/'.$building->foto : null, 'floors' => $building->lantai->count(), 'rooms' => $rooms->count(), 'types' => $roomTypes, 'offers' => $offers];
        })->all());
    }
}
