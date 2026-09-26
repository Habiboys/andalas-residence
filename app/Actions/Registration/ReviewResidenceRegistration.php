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
    public function handle(ResidenceRegistration $registration, User $reviewer, ResidenceRegistrationStatus $status, ?string $notes = null): ResidenceRegistration
    {
        return DB::transaction(function () use ($registration, $reviewer, $status, $notes): ResidenceRegistration {
            $locked = ResidenceRegistration::query()->lockForUpdate()->findOrFail($registration->id);
            if ($locked->completed_at) {
                throw ValidationException::withMessages(['status' => 'Pendaftaran hanya dapat dibatalkan sebelum hunian aktif. Gunakan pengesahan sponsor untuk penempatan.']);
            }
            if ($locked->tagihan && (float) $locked->tagihan->total_dibayar > 0) {
                throw ValidationException::withMessages(['status' => 'Pendaftaran memiliki pembayaran. Selesaikan pengembalian dana terlebih dahulu.']);
            }
            $locked->update(['reserved_room_id' => null, 'reservation_expires_at' => null]);
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

            if ($locked->tagihan_id) {
                $invoice = $locked->tagihan()->lockForUpdate()->firstOrFail();
                if ((float) $invoice->total_dibayar > 0) {
                    throw ValidationException::withMessages(['status' => 'Pendaftaran memiliki pembayaran. Selesaikan pengembalian dana sebelum penolakan.']);
                }
                $invoice->update(['status' => TagihanStatus::Batal]);
            }

            return $locked->fresh(['statusHistories', 'studentProfile.penempatanKamar', 'placement']);
        });
    }
}
