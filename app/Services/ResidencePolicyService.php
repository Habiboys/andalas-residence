<?php

namespace App\Services;

use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\MahasiswaProfil;
use App\Models\ResidencePolicy;
use App\Models\ResidenceRegistration;
use App\Models\ResidenceRate;
use App\Models\RoomType;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ResidencePolicyService
{
    public const CATEGORIES = ['local_non_kipk', 'local_kipk', 'international', 'summer_course', 'non_student'];

    public function masterCatalog(string $category): Collection
    {
        $masterCategory = $category === 'international' ? 'international_student' : $category;
        $types = RoomType::where('active', true)->pluck('name', 'code');
        $rates = ResidenceRate::where('amount', '>', 0)->get()->groupBy('gedung_id');

        return Gedung::with('lantai.kamar')->orderBy('kode_gedung')->get()
            ->filter(fn (Gedung $building): bool => $building->allowed_categories === null
                || in_array($masterCategory, $building->allowed_categories, true))
            ->map(function (Gedung $building) use ($types, $rates, $category): array {
                $roomTypes = $building->lantai->flatMap->kamar->pluck('tipe_kamar')->unique()
                    ->filter(fn (string $type): bool => $types->has($type) && ($building->room_types === null
                        || (bool) (collect($building->room_types)->firstWhere('type', $type)['enabled'] ?? false)));
                $buildingRates = $rates->get($building->id, collect())
                    ->whereIn('tipe_kamar', $roomTypes)
                    ->map(function (ResidenceRate $rate) use ($category): array {
                        $amount = $category !== 'non_student' && $rate->unit === 'day'
                            ? ($rate->student_amount ?? $rate->amount)
                            : $rate->amount;

                        return [
                            'gedung_id' => $rate->gedung_id, 'type' => $rate->tipe_kamar,
                            'type_name' => $rate->tipe_kamar, 'unit' => $rate->unit,
                            'amount' => $amount, 'room_amount' => $rate->room_amount,
                        ];
                    })->filter(fn (array $rate): bool => (float) $rate['amount'] > 0)
                    ->map(fn (array $rate): array => array_replace($rate, ['type_name' => $types[$rate['type']]]))
                    ->values();
                $requiredUnit = match ($category) {
                    'local_kipk' => 'year',
                    'summer_course' => 'day',
                    default => null,
                };
                $eligibleRates = $requiredUnit ? $buildingRates->where('unit', $requiredUnit) : $buildingRates;
                $missing = $roomTypes->diff($eligibleRates->pluck('type'))->map(fn ($type) => $types[$type])->values();
                $rateLabel = match ($requiredUnit) {
                    'year' => 'Tarif tahunan',
                    'day' => 'Tarif harian',
                    default => 'Tarif',
                };

                return [
                    'id' => $building->id, 'name' => $building->nama_gedung,
                    'rates' => $buildingRates->all(),
                    'issue' => $roomTypes->isEmpty() ? 'Belum ada kamar dengan tipe aktif.'
                        : ($missing->isNotEmpty() ? $rateLabel.' belum tersedia untuk '.$missing->implode(', ').'.' : null),
                ];
            })->values();
    }

    public function snapshotRates(string $category, array $buildingIds): array
    {
        $catalog = $this->masterCatalog($category)->keyBy('id');
        $rates = [];
        foreach ($buildingIds as $id) {
            $building = $catalog->get($id);
            if (! $building || $building['issue']) {
                throw ValidationException::withMessages(['settings.building_ids' => $building
                    ? $building['name'].': '.$building['issue'].' Lengkapi Master Gedung.'
                    : 'Gedung tidak menerima kategori pendaftaran ini.']);
            }
            foreach ($building['rates'] as $rate) {
                unset($rate['type_name']);
                $rates[] = $rate;
            }
        }

        return $rates;
    }

    public function category(MahasiswaProfil $student, string $kind = 'regular'): string
    {
        if (in_array($kind, ['summer_course', 'non_student'], true)) {
            return $kind;
        }
        if (! app(ResidenceLifecycle::class)->isLocal($student)) {
            return 'international';
        }

        return app(ResidenceLifecycle::class)->isKipk($student) ? 'local_kipk' : 'local_non_kipk';
    }

    public function current(string $category): ResidencePolicy
    {
        $policy = ResidencePolicy::where('category', $category)->whereNotNull('published_at')->latest('version')->first();
        if (! $policy || ! ($policy->settings['open'] ?? false)) {
            throw ValidationException::withMessages(['policy' => 'Pendaftaran kategori ini belum dibuka. Pengelola perlu menerbitkan konfigurasi tarif, dokumen, dan gedung yang lengkap.']);
        }

        return $policy;
    }

    public function assertProfile(MahasiswaProfil $student): void
    {
        if (! in_array($student->user->gender, ['laki_laki', 'perempuan'], true) || ! $student->prodi_id || ! $student->angkatan) {
            throw ValidationException::withMessages(['profile' => 'Lengkapi jenis kelamin, program studi, dan angkatan sebelum mendaftar.']);
        }
    }

    public function validateRoom(ResidencePolicy $policy, Kamar $room, MahasiswaProfil $student): void
    {
        if (! in_array($room->lantai->gedung_id, $policy->settings['building_ids'], true)
            || ! in_array(RoomEligibility::buildingGender($room->lantai->gedung), ['campur', $student->user->gender], true)) {
            throw ValidationException::withMessages(['kamar_id' => 'Gedung tidak sesuai kebijakan kategori dan jenis kelamin.']);
        }
    }

    /** @return array<string, mixed> */
    public function rate(ResidenceRegistration $registration, Kamar $room): array
    {
        $unit = $registration->rate_unit === 'period' ? 'year' : $registration->rate_unit;
        $rate = collect($registration->policy->settings['rates'])->first(fn (array $rate): bool => $rate['gedung_id'] === $room->lantai->gedung_id && $rate['type'] === $room->tipe_kamar && $rate['unit'] === $unit);
        if (! $rate) {
            throw ValidationException::withMessages(['kamar_id' => 'Tarif kamar belum tersedia pada versi kebijakan pendaftaran ini.']);
        }

        return $rate;
    }

    /** @return Collection<int, Kamar> */
    public function catalog(ResidencePolicy $policy, MahasiswaProfil $student): Collection
    {
        $rooms = Kamar::with('lantai.gedung')->where('status', '!=', 'maintenance')->whereHas('lantai', fn ($q) => $q->whereIn('gedung_id', $policy->settings['building_ids'])->where('booking_open', true))->get()
            ->filter(function (Kamar $room) use ($student, $policy): bool {
                if (! in_array(RoomEligibility::buildingGender($room->lantai->gedung), ['campur', $student->user->gender], true) || ! RoomEligibility::allowsType($room->lantai->gedung, $room->tipe_kamar, $room->kapasitas)) {
                    return false;
                }
                $available = max(0, $room->kapasitas - $room->penempatanKamar()->where('status', 'aktif')->count() - app(RoomReservations::class)->count($room));
                $room->setAttribute('available_places', $available);

                return $available > 0 && collect($policy->settings['rates'])->contains(fn ($rate) => $rate['gedung_id'] === $room->lantai->gedung_id && $rate['type'] === $room->tipe_kamar);
            });

        return $rooms->groupBy(fn (Kamar $room) => $room->lantai->gedung_id)->flatMap(function ($buildingRooms) {
            $first = $buildingRooms->sortBy(fn (Kamar $room): array => [$room->lantai->booking_priority, $room->lantai->nomor_lantai, $room->lantai_id])->first();

            return $buildingRooms->where('lantai_id', $first->lantai_id);
        })->values();
    }
}
