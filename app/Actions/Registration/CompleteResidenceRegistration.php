<?php

namespace App\Actions\Registration;

use App\Enums\ResidenceEvent;
use App\Enums\ResidenceRegistrationStatus;
use App\Enums\TagihanStatus;
use App\Jobs\GenerateBillingDocument;
use App\Models\ResidenceRegistration;
use Illuminate\Support\Facades\DB;

class CompleteResidenceRegistration
{
    public function handle(ResidenceRegistration $registration): void
    {
        DB::transaction(function () use ($registration): void {
            $registration = ResidenceRegistration::query()->lockForUpdate()->findOrFail($registration->id);
            if ($registration->completed_at || $registration->status !== ResidenceRegistrationStatus::Accepted) {
                return;
            }

            $invoice = $registration->tagihan;
            $firstInstallment = $invoice?->jadwalCicilan()->orderBy('termin_ke')->first();
            $paid = $invoice && ($invoice->status === TagihanStatus::Lunas
                || ($firstInstallment && (float) $invoice->total_dibayar >= (float) $firstInstallment->jumlah));
            if (! $paid) {
                return;
            }

            $student = $registration->studentProfile()->lockForUpdate()->firstOrFail();
            $placement = $registration->placement()->where('status', 'aktif')->first();
            if (! $placement) {
                return;
            }

            $hasPreviousStay = $student->residenceHistories()->exists() || $student->penempatanKamar()->where('status', 'berakhir')->exists();
            $student->residenceHistories()->create(['event' => $hasPreviousStay ? ResidenceEvent::Reentered : ResidenceEvent::Entered, 'occurred_at' => now()]);
            $student->update(['status_huni' => 'aktif', 'tanggal_masuk' => $student->tanggal_masuk ?? now()->toDateString()]);
            $registration->update(['completed_at' => now()]);
            GenerateBillingDocument::dispatch($invoice->id, 'residence_receipt')->afterCommit();
        });
    }
}
