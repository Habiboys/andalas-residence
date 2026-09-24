<?php

namespace App\Actions\Registration;

use App\Enums\ResidenceRegistrationStatus;
use App\Enums\TagihanStatus;
use App\Models\ResidenceRegistration;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReviewResidenceRegistration
{
    public function __construct(private PlaceResidenceRegistration $placeRegistration, private CreateResidenceBilling $createBilling, private CompleteResidenceRegistration $completeRegistration) {}

    public function handle(ResidenceRegistration $registration, User $reviewer, ResidenceRegistrationStatus $status, ?string $notes = null, ?string $roomId = null): ResidenceRegistration
    {
        return DB::transaction(function () use ($registration, $reviewer, $status, $notes, $roomId): ResidenceRegistration {
            $locked = ResidenceRegistration::query()->lockForUpdate()->findOrFail($registration->id);
            $allowed = match ($locked->status) {
                ResidenceRegistrationStatus::Submitted => [ResidenceRegistrationStatus::Verified, ResidenceRegistrationStatus::Rejected],
                ResidenceRegistrationStatus::Verified => [ResidenceRegistrationStatus::Accepted, ResidenceRegistrationStatus::Rejected],
                default => [],
            };

            if (! in_array($status, $allowed, true)) {
                throw ValidationException::withMessages(['status' => 'Perubahan status pendaftaran tidak valid.']);
            }

            if ($status === ResidenceRegistrationStatus::Accepted) {
                if (! $roomId) {
                    throw ValidationException::withMessages(['kamar_id' => 'Kamar wajib dipilih saat menerima pendaftaran.']);
                }
                $this->createBilling->handle($locked);
                $placement = $this->placeRegistration->handle($locked, $roomId, $reviewer->id);
                $locked->update(['penempatan_kamar_id' => $placement->id]);
            }

            $fromStatus = $locked->status;
            $locked->update([
                'status' => $status,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
                'notes' => $notes ?? $locked->notes,
            ]);
            $locked->statusHistories()->create([
                'from_status' => $fromStatus,
                'to_status' => $status,
                'changed_by' => $reviewer->id,
                'notes' => $notes,
            ]);

            if ($status === ResidenceRegistrationStatus::Rejected && $locked->tagihan_id) {
                $invoice = $locked->tagihan()->lockForUpdate()->firstOrFail();
                if ((float) $invoice->total_dibayar > 0) {
                    throw ValidationException::withMessages(['status' => 'Pendaftaran memiliki pembayaran. Selesaikan pengembalian dana sebelum penolakan.']);
                }
                $invoice->update(['status' => TagihanStatus::Batal]);
            }
            $this->completeRegistration->handle($locked);

            return $locked->fresh(['statusHistories', 'studentProfile.penempatanKamar', 'placement']);
        });
    }
}
