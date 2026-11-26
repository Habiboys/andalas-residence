<?php

namespace App\Actions\Checkout;

use App\Enums\CheckoutRequestStatus;
use App\Models\CheckoutRequest;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\User;
use App\Notifications\ResidenceWorkflowNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateCheckoutRequest
{
    public function handle(MahasiswaProfil $mahasiswa, ?string $reason = null): CheckoutRequest
    {
        $created = false;

        $checkout = DB::transaction(function () use ($mahasiswa, $reason, &$created): CheckoutRequest {
            $mahasiswa = MahasiswaProfil::query()->lockForUpdate()->findOrFail($mahasiswa->id);
            if ($mahasiswa->status_huni !== 'aktif') {
                throw ValidationException::withMessages(['placement' => 'Checkout hanya tersedia setelah pendaftaran hunian selesai.']);
            }

            $placement = PenempatanKamar::query()
                ->whereBelongsTo($mahasiswa, 'mahasiswa')
                ->where('status', 'aktif')
                ->latest('tanggal_mulai')
                ->first();

            if (! $placement) {
                throw ValidationException::withMessages(['placement' => 'Mahasiswa tidak memiliki penempatan aktif.']);
            }

            $existing = CheckoutRequest::query()
                ->whereBelongsTo($placement, 'placement')
                ->whereNotIn('status', [CheckoutRequestStatus::Selesai, CheckoutRequestStatus::Ditolak])
                ->first();

            if ($existing) {
                return $existing;
            }

            $request = CheckoutRequest::create([
                'mahasiswa_id' => $mahasiswa->id,
                'penempatan_kamar_id' => $placement->id,
                'status' => CheckoutRequestStatus::Diajukan,
                'alasan' => $reason,
                'diajukan_at' => now(),
            ]);

            $request->inspection()->create([]);
            $created = true;

            return $request->load(['inspection', 'placement.kamar.lantai.gedung', 'mahasiswa.user']);
        });

        if ($created) {
            $this->notifyBuildingOfficers($checkout);
        }

        return $checkout;
    }

    private function notifyBuildingOfficers(CheckoutRequest $checkout): void
    {
        $room = $checkout->placement?->kamar;
        $building = $room?->lantai?->gedung;
        if ($room === null || $building === null) {
            return;
        }

        $activePlacementsCount = PenempatanKamar::query()
            ->where('kamar_id', $room->id)
            ->where('status', 'aktif')
            ->count();

        $pendingCheckoutsCount = CheckoutRequest::query()
            ->whereNotIn('status', [CheckoutRequestStatus::Selesai, CheckoutRequestStatus::Ditolak])
            ->whereHas('placement', fn ($q) => $q->where('kamar_id', $room->id)->where('status', 'aktif'))
            ->count();

        $allOut = $activePlacementsCount > 0 && $pendingCheckoutsCount >= $activePlacementsCount;
        $studentName = $checkout->mahasiswa?->user->nama ?? 'Penghuni';
        $subject = $allOut
            ? 'Kamar Checkout Siap Dicek GO'
            : 'Pengajuan Checkout Penghuni';
        $message = $allOut
            ? "Seluruh penghuni {$building->nama_gedung} Kamar {$room->nomor_kamar} (termasuk {$studentName}) telah mengajukan checkout. Mohon GO segera melakukan pengecekan kondisi kamar."
            : "{$studentName} mengajukan checkout dari {$building->nama_gedung} Kamar {$room->nomor_kamar}. Mohon monitor dan lakukan pengecekan kamar.";

        $buildingGos = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'go')->where('guard_name', 'web'))
            ->whereHas('fasilitatorWilayah', fn ($q) => $q->where('gedung_id', $building->id))
            ->get();
        if ($buildingGos->isEmpty()) {
            $buildingGos = User::query()
                ->whereHas('roles', fn ($q) => $q->where('name', 'go')->where('guard_name', 'web'))
                ->get();
        }

        $buildingFacilitators = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'fasilitator')->where('guard_name', 'web'))
            ->whereHas('fasilitatorWilayah', fn ($q) => $q->where('gedung_id', $building->id))
            ->get();

        $recipients = $buildingGos->merge($buildingFacilitators)->unique('id');
        $registrationId = $checkout->placement->registration?->id;
        foreach ($recipients as $recipient) {
            $recipient->notify(new ResidenceWorkflowNotification($subject, $message, $registrationId));
        }
    }
}
