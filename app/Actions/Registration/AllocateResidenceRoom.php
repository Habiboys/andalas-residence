<?php

namespace App\Actions\Registration;

use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\ResidenceRegistration;
use App\Models\RoomContract;
use App\Services\ResidencePolicyService;
use App\Services\ResidenceWorkflow;
use App\Services\RoomEligibility;
use App\Services\RoomReservations;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AllocateResidenceRoom
{
    public function handle(ResidenceRegistration $registration, ?string $selectedRoom = null): void
    {
        DB::transaction(function () use ($registration, $selectedRoom): void {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            if ($r->reserved_room_id || $r->completed_at || $r->isClosed()) {
                return;
            }
            $buildings = $r->policy->settings['building_ids'];
            if ($selectedRoom && $r->policy->category === 'local_non_kipk' && ! app(ResidencePolicyService::class)->catalog($r->policy, $r->studentProfile)->contains('id', $selectedRoom)) {
                throw ValidationException::withMessages(['preferences' => 'Kamar tidak tersedia pada lantai prioritas yang dibuka.']);
            }
            foreach ($buildings as $buildingId) {
                Gedung::whereKey($buildingId)->lockForUpdate()->firstOrFail();
                $rooms = Kamar::with('lantai.gedung')->whereHas('lantai', fn ($q) => $q->where('gedung_id', $buildingId)->where('booking_open', true))
                    ->when($selectedRoom, fn ($q) => $q->whereKey($selectedRoom))->where('status', '!=', 'maintenance')->lockForUpdate()->get()
                    ->sortBy(fn (Kamar $room): array => [$room->lantai->booking_priority, $room->lantai->nomor_lantai, $room->nomor_kamar, $room->id]);
                foreach ($rooms as $room) {
                    try {
                        app(ResidencePolicyService::class)->validateRoom($r->policy, $room, $r->studentProfile);
                        $rate = app(ResidencePolicyService::class)->rate($r, $room);
                        $isFullRoomBasis = in_array($r->billing_basis, ['room', 'group'], true);
                        $roomTotalAmount = ! empty($rate['room_amount']) && (float) $rate['room_amount'] > 0
                            ? (float) $rate['room_amount']
                            : ($r->billing_basis === 'group' ? (float) ($rate['amount'] ?? 0) * max(1, (int) $room->kapasitas) : 0.0);
                        if ($isFullRoomBasis && (! in_array($r->rate_unit, ['year', 'semester'], true) || $roomTotalAmount <= 0)) {
                            throw ValidationException::withMessages(['billing_basis' => 'Tarif per kamar belum tersedia untuk satuan ini.']);
                        }
                        if (! RoomEligibility::allowsType($room->lantai->gedung, $room->tipe_kamar, $room->kapasitas)) {
                            continue;
                        }
                        $occupied = count($room->penempatanKamar()->where('status', 'aktif')->lockForUpdate()->get(['id'])->all());
                        $held = app(RoomReservations::class)->count($room, $r->id);
                        if ($occupied + $held >= $room->kapasitas || ($isFullRoomBasis && $occupied + $held > 0)) {
                            continue;
                        }
                        $initialAllocationStatus = ($r->is_kipk || $r->funding === 'sponsor')
                            ? 'admin_occupied'
                            : 'held';
                        $r->update(['reserved_room_id' => $room->id, 'allocation_status' => $initialAllocationStatus]);
                        if ($isFullRoomBasis) {
                            if (! $r->room_contract_id) {
                                $contract = RoomContract::create([
                                    'kamar_id' => $room->id,
                                    'occupants' => 1,
                                    'total' => $roomTotalAmount,
                                    'members' => [$r->id],
                                    'approved_by' => $r->studentProfile->user_id,
                                    'approved_at' => now(),
                                ]);
                                $r->update(['room_contract_id' => $contract->id]);
                            }
                            app(CreateResidenceBilling::class)->handle($r->fresh());
                        } else {
                            app(CreateResidenceBilling::class)->handle($r);
                        }
                        app(ResidenceWorkflow::class)->evaluate($r->fresh());
                        app(ResidenceWorkflow::class)->notify($r, 'Alokasi kamar ditetapkan', 'Kamar '.$room->nomor_kamar.' di '.$room->lantai->gedung->nama_gedung.' telah dialokasikan. Lengkapi administrasi pendaftaran.', true);

                        return;
                    } catch (ValidationException $e) {
                        if ($selectedRoom) {
                            throw $e;
                        }
                    }
                }
            }
            if ($selectedRoom) {
                throw ValidationException::withMessages(['preferences' => 'Kamar tidak tersedia atau tidak sesuai kebijakan.']);
            }
            $r->update(['allocation_status' => 'waiting']);
        });
    }
}
