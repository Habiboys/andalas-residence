<?php

namespace App\Actions\Registration;

use App\Enums\ResidenceEvent;
use App\Enums\ResidenceRegistrationStatus;
use App\Enums\TagihanStatus;
use App\Jobs\GenerateBillingDocument;
use App\Models\ResidenceRegistration;
use App\Services\ResidenceLifecycle;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompleteResidenceRegistration
{
    public function handle(ResidenceRegistration $registration): void
    {
        DB::transaction(function () use ($registration): void {
            $registration = ResidenceRegistration::query()->lockForUpdate()->findOrFail($registration->id);
            if ($registration->completed_at || in_array($registration->status, [ResidenceRegistrationStatus::Draft, ResidenceRegistrationStatus::Rejected], true)) {
                return;
            }

            $invoice = $registration->tagihan;
            $firstInstallment = $invoice?->jadwalCicilan()->orderBy('termin_ke')->first();
            $paid = $invoice && ($invoice->status === TagihanStatus::Lunas
                || ($firstInstallment && (float) $invoice->total_dibayar >= (float) $firstInstallment->jumlah) || ($invoice->amount_due_now !== null && (float) $invoice->total_dibayar >= (float) $invoice->amount_due_now));
            if (! $paid || ($registration->funding === 'sponsor' && ! $registration->sponsor_approved_at)) {
                return;
            }

            $student = $registration->studentProfile()->lockForUpdate()->firstOrFail();
            if ($student->user->status !== 'aktif' && $student->user->inactive_reason !== 'letter_issued') {
                throw ValidationException::withMessages(['status' => 'Akun diblokir administrator.']);
            }
            $placement = $registration->placement()->where('status', 'aktif')->first();
            if (! $placement && $registration->reserved_room_id) {
                $placement = app(PlaceResidenceRegistration::class)->handle($registration, $registration->reserved_room_id, $registration->reviewed_by ?? $student->user_id);
                $registration->update(['penempatan_kamar_id' => $placement->id]);
            }
            if (! $placement) {
                return;
            }

            $hasPreviousStay = app(ResidenceLifecycle::class)->hasEndedStay($student);
            $student->residenceHistories()->create(['event' => $hasPreviousStay ? ResidenceEvent::Reentered : ResidenceEvent::Entered, 'occurred_at' => now()]);
            $student->update(['status_huni' => 'aktif', 'tanggal_masuk' => $student->tanggal_masuk ?? now()->toDateString()]);
            $registration->update(['completed_at' => now(), 'status' => ResidenceRegistrationStatus::Accepted, 'reservation_expires_at' => null]);
            if ($student->user->inactive_reason === 'letter_issued') {
                $student->user->update(['status' => 'aktif', 'inactive_reason' => null]);
            }
            if ((float) $invoice->total_dibayar > 0) {
                GenerateBillingDocument::dispatch($invoice->id, 'residence_receipt')->afterCommit();
            }
        });
    }
}
