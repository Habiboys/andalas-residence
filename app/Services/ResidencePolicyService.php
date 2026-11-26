<?php

namespace App\Services;

use App\Enums\ClientProfileCategory;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\MahasiswaProfil;
use App\Models\ResidencePolicy;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Models\RoomType;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ResidencePolicyService
{
    public const CATEGORIES = ['local_non_kipk', 'local_kipk', 'international', 'summer_course', 'non_student', 'asn'];

    public const RATE_UNITS = ['year', 'semester', 'month', 'day'];

    /** @return Collection<int, array{id: string, name: string, rates: list<array<string, mixed>>, issue: string|null}> */
    public function masterCatalog(string $category): Collection
    {
        $masterCategory = $category === 'international' ? 'international_student' : $category;
        $types = RoomType::where('active', true)->pluck('name', 'code');
        $rates = ResidenceRate::query()
            ->where(fn ($query) => $query->where('amount', '>', 0)->orWhere('room_amount', '>', 0))
            ->whereIn('category', [$category, ResidenceRate::DEFAULT_CATEGORY])
            ->get()
            ->groupBy('gedung_id');

        $catalog = collect();
        foreach (Gedung::with('lantai.kamar')->orderBy('kode_gedung')->get() as $building) {
            if (! (($building->allowed_categories === null
                || in_array($masterCategory, $building->allowed_categories, true)
                || in_array($category, $building->allowed_categories, true))
                && RoomEligibility::allowsCanonicalBuilding($category, $building))) {
                continue;
            }

            $catalog->push($this->buildMasterCatalogEntry(
                $building,
                $category,
                $types,
                $rates->get($building->id, collect())->values(),
            ));
        }

        return $catalog->values();
    }

    /**
     * @param  Collection<string, string>  $types
     * @param  Collection<int, ResidenceRate>  $buildingRawRates
     * @return array{id: string, name: string, rates: list<array<string, mixed>>, issue: string|null}
     */
    private function buildMasterCatalogEntry(Gedung $building, string $category, Collection $types, Collection $buildingRawRates): array
    {
        $roomTypes = $building->lantai->flatMap->kamar->pluck('tipe_kamar')->unique()
            ->filter(fn (string $type): bool => $types->has($type) && ($building->room_types === null
                || (bool) (collect($building->room_types)->firstWhere('type', $type)['enabled'] ?? false)))
            ->values();
        $rawBuildingRates = $buildingRawRates->whereIn('tipe_kamar', $roomTypes);
        $buildingRates = $this->resolveBuildingRatesForCategory($building->id, $category, $roomTypes, $rawBuildingRates, $types);

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
        $issue = $roomTypes->isEmpty()
            ? 'Belum ada kamar dengan tipe aktif.'
            : ($missing->isNotEmpty() ? $rateLabel.' belum tersedia untuk '.$missing->implode(', ').'.' : null);

        return [
            'id' => (string) $building->id,
            'name' => (string) $building->nama_gedung,
            'rates' => array_values($buildingRates->all()),
            'issue' => $issue,
        ];
    }

    /**
     * Resolve effective rates for one building & category, preferring category-specific overrides
     * over 'default' rates, and auto-deriving 6-month ('semester') rates as half of yearly rates.
     *
     * @param  Collection<int, string>  $roomTypes
     * @param  Collection<int, ResidenceRate>  $rawBuildingRates
     * @param  Collection<string, string>  $typeNames
     * @return Collection<int, array<string, mixed>>
     */
    private function resolveBuildingRatesForCategory(
        string $buildingId,
        string $category,
        Collection $roomTypes,
        Collection $rawBuildingRates,
        Collection $typeNames,
    ): Collection {
        $resolved = collect();

        foreach ($roomTypes as $type) {
            $typeRates = $rawBuildingRates->where('tipe_kamar', $type);
            $byUnit = [];

            foreach (self::RATE_UNITS as $unit) {
                /** @var ResidenceRate|null $specific */
                $specific = $typeRates->first(fn (ResidenceRate $r): bool => $r->unit === $unit && $r->category === $category);
                /** @var ResidenceRate|null $default */
                $default = $typeRates->first(fn (ResidenceRate $r): bool => $r->unit === $unit && $r->category === ResidenceRate::DEFAULT_CATEGORY);
                $chosen = $specific ?? $default;
                if (! $chosen) {
                    continue;
                }

                $amount = $specific === null && $category !== 'non_student' && $unit === 'day' && $chosen->student_amount !== null
                    ? (float) $chosen->student_amount
                    : (float) $chosen->amount;
                $roomAmount = $chosen->room_amount !== null ? (float) $chosen->room_amount : null;

                if ($amount <= 0 && ($roomAmount === null || $roomAmount <= 0)) {
                    continue;
                }

                $byUnit[$unit] = [
                    'gedung_id' => $buildingId,
                    'type' => $type,
                    'type_name' => $typeNames[$type] ?? $type,
                    'unit' => $unit,
                    'amount' => $amount,
                    'room_amount' => $roomAmount,
                ];
            }

            if (! isset($byUnit['semester']) && isset($byUnit['year']) && ! in_array($category, ['local_kipk', 'summer_course'], true)) {
                $yearRate = $byUnit['year'];
                $byUnit['semester'] = [
                    'gedung_id' => $buildingId,
                    'type' => $type,
                    'type_name' => $typeNames[$type] ?? $type,
                    'unit' => 'semester',
                    'amount' => round((float) $yearRate['amount'] / 2),
                    'room_amount' => $yearRate['room_amount'] !== null && (float) $yearRate['room_amount'] > 0
                        ? round((float) $yearRate['room_amount'] / 2)
                        : null,
                ];
            }

            foreach (self::RATE_UNITS as $unit) {
                if (isset($byUnit[$unit])) {
                    $resolved->push($byUnit[$unit]);
                }
            }
        }

        return $resolved->values();
    }

    /**
     * @param  list<string>  $buildingIds
     * @return list<array<string, mixed>>
     */
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

    /**
     * Refresh rate snapshots on currently published policies whenever admin updates master pricing.
     */
    public function syncPublishedPolicyRates(?string $category = null, ?string $actorId = null): int
    {
        $categories = $category !== null && $category !== ResidenceRate::DEFAULT_CATEGORY
            ? [$category]
            : self::CATEGORIES;
        $updated = 0;

        foreach ($categories as $cat) {
            $latest = ResidencePolicy::where('category', $cat)
                ->whereNotNull('published_at')
                ->latest('version')
                ->first();
            if (! $latest) {
                continue;
            }
            $buildingIds = $latest->settings['building_ids'];
            if ($buildingIds === []) {
                continue;
            }

            $catalog = $this->masterCatalog($cat)->keyBy('id');
            $newRates = [];
            foreach ($buildingIds as $buildingId) {
                $entry = $catalog->get($buildingId);
                if (! $entry) {
                    continue;
                }
                foreach ($entry['rates'] as $rate) {
                    unset($rate['type_name']);
                    $newRates[] = $rate;
                }
            }

            if ($newRates === []) {
                continue;
            }

            $settings = [...$latest->settings, 'rates' => $newRates];
            $hasRegistrations = ResidenceRegistration::where('residence_policy_id', $latest->id)->exists();
            if ($hasRegistrations) {
                ResidencePolicy::create([
                    'category' => $cat,
                    'version' => (int) $latest->version + 1,
                    'settings' => $settings,
                    'published_at' => now(),
                    'created_by' => $actorId ?? $latest->created_by,
                ]);
            } else {
                $latest->update(['settings' => $settings]);
            }
            $updated++;
        }

        return $updated;
    }

    public function category(MahasiswaProfil $student, string $kind = 'regular'): string
    {
        if (in_array($kind, ['summer_course', 'non_student'], true)) {
            return $kind;
        }
        if ($student->user->client_profile_category === ClientProfileCategory::Asn) {
            return 'asn';
        }
        if (! app(ResidenceLifecycle::class)->isLocal($student)) {
            return 'international';
        }

        return app(ResidenceLifecycle::class)->isKipk($student) ? 'local_kipk' : 'local_non_kipk';
    }

    public function parseDeadline(?string $raw): ?Carbon
    {
        if (! is_string($raw) || trim($raw) === '') {
            return null;
        }

        return Carbon::parse($raw, config('residence.timezone', 'Asia/Jakarta'))
            ->timezone(config('app.timezone', 'UTC'));
    }

    public function registrationDeadline(ResidencePolicy $policy): ?Carbon
    {
        $raw = $policy->settings['registration_deadline'] ?? null;

        return is_string($raw) ? $this->parseDeadline($raw) : null;
    }

    public function current(string $category): ResidencePolicy
    {
        $policy = ResidencePolicy::where('category', $category)->whereNotNull('published_at')->latest('version')->first();
        if (! $policy || ! ($policy->settings['open'] ?? false)) {
            throw ValidationException::withMessages(['policy' => 'Pendaftaran kategori ini belum dibuka. Pengelola perlu menerbitkan konfigurasi tarif, dokumen, dan gedung yang lengkap.']);
        }
        $deadline = $this->registrationDeadline($policy);
        if ($deadline?->isPast()) {
            throw ValidationException::withMessages(['policy' => 'Batas waktu pendaftaran jalur ini telah berakhir.']);
        }

        return $policy;
    }

    public function assertProfile(MahasiswaProfil $student): void
    {
        $isAsn = $student->user->client_profile_category === ClientProfileCategory::Asn;
        if ($isAsn) {
            if (! in_array($student->user->gender, ['laki_laki', 'perempuan'], true)) {
                throw ValidationException::withMessages(['profile' => 'Lengkapi jenis kelamin sebelum mendaftar hunian ASN.']);
            }

            return;
        }

        if ($student->is_external_campus) {
            if (! in_array($student->user->gender, ['laki_laki', 'perempuan'], true)
                || ! filled($student->external_campus_name)
                || ! filled($student->external_program_name)
                || ! $student->angkatan) {
                throw ValidationException::withMessages(['profile' => 'Lengkapi jenis kelamin, nama kampus asal, program studi, dan angkatan sebelum mendaftar.']);
            }

            return;
        }

        if (! in_array($student->user->gender, ['laki_laki', 'perempuan'], true) || ! $student->prodi_id || ! $student->angkatan) {
            throw ValidationException::withMessages(['profile' => 'Lengkapi jenis kelamin, program studi, dan angkatan sebelum mendaftar.']);
        }
    }

    public function validateRoom(ResidencePolicy $policy, Kamar $room, MahasiswaProfil $student): void
    {
        if (! in_array($room->lantai->gedung_id, $policy->settings['building_ids'], true)
            || ! in_array(RoomEligibility::buildingGender($room->lantai->gedung), ['campur', $student->user->gender], true)
            || ! RoomEligibility::allowsCanonicalBuilding($policy->category, $room->lantai->gedung, $student->user->gender)) {
            throw ValidationException::withMessages(['kamar_id' => 'Gedung tidak sesuai kebijakan kategori dan jenis kelamin.']);
        }
    }

    /** @return array<string, mixed> */
    public function rate(ResidenceRegistration $registration, Kamar $room): array
    {
        $unit = $registration->rate_unit === 'period' ? 'year' : $registration->rate_unit;
        $policyRates = collect($registration->policy->settings['rates']);
        $rate = $policyRates->first(fn (array $rate): bool => $rate['gedung_id'] === $room->lantai->gedung_id && $rate['type'] === $room->tipe_kamar && $rate['unit'] === $unit);

        if (! $rate && $unit === 'semester') {
            $yearRate = $policyRates->first(fn (array $rate): bool => $rate['gedung_id'] === $room->lantai->gedung_id && $rate['type'] === $room->tipe_kamar && $rate['unit'] === 'year');
            if ($yearRate) {
                $rate = [
                    ...$yearRate,
                    'unit' => 'semester',
                    'amount' => round((float) $yearRate['amount'] / 2),
                    'room_amount' => ! empty($yearRate['room_amount']) && (float) $yearRate['room_amount'] > 0
                        ? round((float) $yearRate['room_amount'] / 2)
                        : null,
                ];
            }
        }

        if (! $rate) {
            throw ValidationException::withMessages(['kamar_id' => 'Tarif kamar belum tersedia pada versi kebijakan pendaftaran ini.']);
        }
        if (((float) $rate['amount']) <= 0 && ((float) ($rate['room_amount'] ?? 0)) > 0) {
            $rate['amount'] = (float) $rate['room_amount'] / max(1, (int) $room->kapasitas);
        }

        return $rate;
    }

    /** @return Collection<int, Kamar> */
    public function catalog(ResidencePolicy $policy, MahasiswaProfil $student): Collection
    {
        $rooms = Kamar::with('lantai.gedung')->where('status', '!=', 'maintenance')->whereHas('lantai', fn ($q) => $q->whereIn('gedung_id', $policy->settings['building_ids'])->where('booking_open', true))->get()
            ->filter(function (Kamar $room) use ($student, $policy): bool {
                if (! in_array(RoomEligibility::buildingGender($room->lantai->gedung), ['campur', $student->user->gender], true)
                    || ! RoomEligibility::allowsCanonicalBuilding($policy->category, $room->lantai->gedung, $student->user->gender)
                    || ! RoomEligibility::allowsType($room->lantai->gedung, $room->tipe_kamar, $room->kapasitas)) {
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
