<?php

namespace App\Services;

use App\Models\Kamar;
use App\Models\ResidenceRegistration;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class FloorRoomAvailability
{
    /** @return Collection<int, Kamar> */
    public function catalog(User $user): Collection
    {
        $buildingEligibility = [];
        $rooms = RoomEligibility::available()->withCount(['penempatanKamar as active_occupants_count' => fn ($query) => $query->where('status', 'aktif')])->get()
            ->filter(function (Kamar $room) use ($user, &$buildingEligibility): bool {
                $buildingEligibility[$room->lantai->gedung_id] ??= RoomEligibility::allows($room->lantai->gedung, $user);

                return $room->lantai->booking_open && $buildingEligibility[$room->lantai->gedung_id]
                    && RoomEligibility::allowsType($room->lantai->gedung, $room->tipe_kamar, $room->kapasitas);
            });
        $held = app(RoomReservations::class)->held()->whereIn('reserved_room_id', $rooms->modelKeys())->get(['reserved_room_id', 'billing_basis'])->groupBy('reserved_room_id');
        $exclusiveRooms = ResidenceRegistration::where('billing_basis', 'room')->whereHas('placement', fn ($query) => $query->where('status', 'aktif')->whereIn('kamar_id', $rooms->modelKeys()))
            ->with('placement:id,kamar_id')->get()->pluck('placement.kamar_id')->all();

        $rooms = $rooms->filter(function (Kamar $room) use ($held, $exclusiveRooms): bool {
            $reservations = $held->get($room->id, collect());
            $exclusive = $reservations->contains('billing_basis', 'room') || in_array($room->id, $exclusiveRooms, true);
            $room->setAttribute('available_places', $exclusive ? 0 : max(0, $room->kapasitas - $room->active_occupants_count - $reservations->count()));
            $room->setAttribute('facilities', collect($room->lantai->gedung->room_types ?? [])->firstWhere('type', $room->tipe_kamar)['facilities'] ?? '');

            return $room->available_places > 0;
        });

        return $rooms->groupBy(fn (Kamar $room): string => $room->lantai->gedung_id)->flatMap(function ($buildingRooms) {
            $first = $buildingRooms->sortBy(fn (Kamar $room): array => [$room->lantai->booking_priority, $room->lantai->nomor_lantai, $room->lantai_id])->first();

            return $buildingRooms->where('lantai_id', $first->lantai_id);
        })->values();
    }

    public function validate(Kamar $room, User $user, string $field, ?string $registrationId = null): void
    {
        if ($registrationId && app(RoomReservations::class)->held()->whereKey($registrationId)->where('reserved_room_id', $room->id)->exists()) {
            return;
        }
        if (! $this->catalog($user)->contains('id', $room->id)) {
            throw ValidationException::withMessages([$field => 'Kamar belum dibuka atau lantai prioritas sebelumnya masih memiliki tempat. Pilih kamar yang tersedia di katalog.']);
        }
    }
}
