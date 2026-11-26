<?php

namespace App\Actions\Checkout;

use App\Enums\CheckoutRequestStatus;
use App\Enums\ResidenceEvent;
use App\Enums\RoomInspectionStatus;
use App\Models\CheckoutRequest;
use App\Models\Kamar;
use App\Models\PenempatanKamar;
use App\Models\User;
use App\Notifications\ResidenceWorkflowNotification;
use App\Services\AuditLogService;
use App\Services\RoomReservations;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AutoApproveExpiredCheckouts
{
    public const AUTO_APPROVE_DAYS = 14;

    public function handle(): int
    {
        $cutoff = now()->subDays(self::AUTO_APPROVE_DAYS);
        $ids = CheckoutRequest::query()
            ->whereNotIn('status', [CheckoutRequestStatus::Selesai, CheckoutRequestStatus::Ditolak])
            ->whereNotNull('diajukan_at')
            ->where('diajukan_at', '<=', $cutoff)
            ->pluck('id');

        $approvedCount = 0;

        foreach ($ids as $checkoutId) {
            $completed = DB::transaction(function () use ($checkoutId): ?CheckoutRequest {
                $request = CheckoutRequest::query()
                    ->with(['inspection.findings', 'mahasiswa.user', 'placement.kamar.lantai.gedung', 'placement.registration'])
                    ->whereKey($checkoutId)
                    ->lockForUpdate()
                    ->first();

                if (
                    $request === null
                    || in_array($request->status, [CheckoutRequestStatus::Selesai, CheckoutRequestStatus::Ditolak], true)
                ) {
                    return null;
                }

                $placement = PenempatanKamar::query()->with('registration')->lockForUpdate()->find($request->penempatan_kamar_id);
                if ($placement === null) {
                    return null;
                }

                $room = Kamar::query()->lockForUpdate()->find($placement->kamar_id);
                $autoNote = 'Disetujui otomatis oleh sistem setelah 14 hari tanpa pemeriksaan GO.';
                $inspection = $request->inspection;

                if ($inspection === null) {
                    $inspection = $request->inspection()->create([
                        'status' => RoomInspectionStatus::Selesai,
                        'catatan' => $autoNote,
                        'inspected_at' => now(),
                    ]);
                } elseif ($inspection->status !== RoomInspectionStatus::Selesai) {
                    $existingNote = trim((string) ($inspection->catatan ?? ''));
                    $inspection->update([
                        'status' => RoomInspectionStatus::Selesai,
                        'catatan' => $existingNote !== '' ? $existingNote.' | '.$autoNote : $autoNote,
                        'inspected_at' => now(),
                    ]);
                }

                if ($placement->status === 'aktif') {
                    $placement->update([
                        'status' => 'berakhir',
                        'tanggal_selesai' => now()->toDateString(),
                    ]);
                }

                $request->mahasiswa()->update(['status_huni' => 'keluar']);
                $request->mahasiswa->residenceHistories()->create([
                    'event' => ResidenceEvent::CheckedOut,
                    'occurred_at' => now(),
                ]);

                $hasFindings = $inspection->findings()->exists();
                if ($placement->registration !== null) {
                    $placement->registration->update([
                        'keys_returned_at' => now(),
                        'return_condition' => $hasFindings ? 'damaged' : 'ready',
                        'ended_at' => now(),
                        'allocation_status' => 'released',
                    ]);
                }

                if ($room !== null) {
                    $activeOccupants = PenempatanKamar::query()
                        ->whereBelongsTo($room, 'kamar')
                        ->where('status', 'aktif')
                        ->count();
                    $occupied = $activeOccupants + app(RoomReservations::class)->count($room);

                    if ($hasFindings) {
                        $room->update(['status' => 'maintenance']);
                    } elseif ($room->status !== 'maintenance') {
                        $room->update(['status' => match (true) {
                            $occupied === 0 => 'kosong',
                            $occupied >= $room->kapasitas => 'penuh',
                            default => 'terisi_sebagian',
                        }]);
                    }
                }

                $request->update([
                    'status' => CheckoutRequestStatus::Selesai,
                    'disetujui_at' => $request->disetujui_at ?? now(),
                    'selesai_at' => now(),
                ]);

                AuditLogService::log(null, 'checkout_auto_approved_14_days', $request, null, [
                    'checkout_request_id' => $request->id,
                    'diajukan_at' => Carbon::parse($request->diajukan_at)->toDateTimeString(),
                    'auto_approved_at' => now()->toDateTimeString(),
                ]);

                return $request;
            });

            if ($completed !== null) {
                $approvedCount++;
                $this->notifyAutoApproval($completed);
            }
        }

        return $approvedCount;
    }

    private function notifyAutoApproval(CheckoutRequest $checkout): void
    {
        $room = $checkout->placement?->kamar;
        $building = $room?->lantai?->gedung;
        $studentUser = $checkout->mahasiswa?->user;
        $roomLabel = $building !== null ? "{$building->nama_gedung} Kamar {$room->nomor_kamar}" : 'kamar hunian';

        $subject = 'Checkout Disetujui Otomatis (14 Hari)';
        $message = "Pengajuan checkout untuk {$roomLabel} telah disetujui dan diselesaikan otomatis oleh sistem setelah 14 hari tanpa pemeriksaan GO. Kapasitas kamar telah diperbarui.";

        $recipients = collect([$studentUser])->filter();
        if ($building !== null) {
            $recipients = $recipients->merge(
                User::query()
                    ->whereHas('roles', fn ($q) => $q->where('name', 'fasilitator')->where('guard_name', 'web'))
                    ->whereHas('fasilitatorWilayah', fn ($q) => $q->where('gedung_id', $building->id))
                    ->get()
            );
        }

        $registrationId = $checkout->placement?->registration?->id;
        foreach ($recipients->unique('id') as $recipient) {
            $recipient->notify(new ResidenceWorkflowNotification($subject, $message, $registrationId));
        }
    }
}
