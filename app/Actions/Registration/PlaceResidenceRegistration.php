<?php

namespace App\Actions\Registration;

use App\Models\Kamar;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\ResidenceRegistration;
use App\Services\RoomEligibility;
use Illuminate\Validation\ValidationException;

class PlaceResidenceRegistration
{
    public function handle(ResidenceRegistration $registration, string $roomId, string $officerId): PenempatanKamar
    {
        MahasiswaProfil::query()->lockForUpdate()->findOrFail($registration->student_profile_id);
        $room = Kamar::query()->lockForUpdate()->findOrFail($roomId);
        RoomEligibility::validate($room, $registration->studentProfile->user);

        if (! $registration->is_kipk && ! $registration->roomPreferences()->where('kamar_id', $room->id)->exists()) {
            throw ValidationException::withMessages(['kamar_id' => 'Kamar harus berasal dari preferensi mahasiswa.']);
        }

        if ($room->status === 'maintenance') {
            throw ValidationException::withMessages(['kamar_id' => 'Kamar sedang dalam pemeliharaan.']);
        }

        $hasActivePlacement = PenempatanKamar::query()
            ->where('mahasiswa_id', $registration->student_profile_id)
            ->where('status', 'aktif')
            ->lockForUpdate()
            ->exists();

        if ($hasActivePlacement) {
            throw ValidationException::withMessages(['kamar_id' => 'Mahasiswa sudah memiliki penempatan aktif.']);
        }

        $occupancy = PenempatanKamar::query()
            ->where('kamar_id', $room->id)
            ->where('status', 'aktif')
            ->lockForUpdate()
            ->count();

        if ($occupancy >= $room->kapasitas) {
            throw ValidationException::withMessages(['kamar_id' => 'Kamar sudah penuh.']);
        }

        $placement = PenempatanKamar::query()->create([
            'mahasiswa_id' => $registration->student_profile_id,
            'kamar_id' => $room->id,
            'periode_id' => $registration->periode_id,
            'tanggal_mulai' => now()->toDateString(),
            'status' => 'aktif',
            'diproses_oleh' => $officerId,
        ]);

        $room->update(['status' => $occupancy + 1 >= $room->kapasitas ? 'penuh' : 'terisi_sebagian']);
        $registration->studentProfile()->update(['periode_id' => $registration->periode_id]);

        return $placement;
    }
}
