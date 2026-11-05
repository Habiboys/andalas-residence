<?php

namespace App\Services;

use App\Models\Kamar;
use App\Models\MahasiswaProfil;
use App\Models\ResidencePolicy;
use App\Models\ResidenceRegistration;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ResidencePolicyService
{
    public const CATEGORIES = ['local_non_kipk', 'local_kipk', 'international', 'summer_course', 'non_student'];

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
