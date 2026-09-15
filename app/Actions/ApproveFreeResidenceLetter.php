<?php

namespace App\Actions;

use App\Enums\CheckoutRequestStatus;
use App\Enums\ClearanceStatus;
use App\Enums\FreeResidenceLetterStatus;
use App\Enums\LegacyFreeResidenceVerificationPath;
use App\Jobs\GenerateFreeResidenceLetter;
use App\Models\PengajuanBebasAsrama;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApproveFreeResidenceLetter
{
    public function handle(PengajuanBebasAsrama $pengajuan, User $approver): PengajuanBebasAsrama
    {
        return DB::transaction(function () use ($pengajuan, $approver): PengajuanBebasAsrama {
            $application = PengajuanBebasAsrama::query()
                ->with(['checkoutRequest.assetClearance', 'checkoutRequest.financeClearance'])
                ->lockForUpdate()
                ->findOrFail($pengajuan->id);

            if ($application->status === FreeResidenceLetterStatus::Disetujui) {
                return $application;
            }

            if ($application->status !== FreeResidenceLetterStatus::Diverifikasi) {
                throw ValidationException::withMessages(['status' => 'Pengajuan harus diverifikasi sebelum disetujui.']);
            }

            $application->lifecycle_year <= 2025
                ? $this->validateLegacy($application)
                : $this->validateModern($application);

            $application->update([
                'status' => FreeResidenceLetterStatus::Disetujui,
                'disetujui_oleh' => $approver->id,
                'approved_at' => now(),
            ]);
            $application->statusHistories()->create([
                'status' => FreeResidenceLetterStatus::Disetujui,
                'changed_by' => $approver->id,
            ]);
            $intent = $application->documentIntent()->firstOrCreate([], [
                'status' => 'pending',
                'requested_at' => now(),
            ]);
            GenerateFreeResidenceLetter::dispatch($intent->id)->afterCommit();

            return $application->fresh(['statusHistories', 'documentIntent']);
        });
    }

    private function validateLegacy(PengajuanBebasAsrama $application): void
    {
        if (! $application->legacy_verification_path) {
            throw ValidationException::withMessages(['legacy_verification_path' => 'Jalur verifikasi admin wajib dipilih.']);
        }

        if (in_array($application->legacy_verification_path, [LegacyFreeResidenceVerificationPath::AlumniPaid, LegacyFreeResidenceVerificationPath::AlumniUnpaid], true)
            && ! $application->graduation_evidence_path) {
            throw ValidationException::withMessages(['graduation_evidence_path' => 'Bukti kelulusan privat wajib tersedia.']);
        }

        if ($application->legacy_verification_path === LegacyFreeResidenceVerificationPath::AlumniPaid
            && ! $application->payment_evidence_path) {
            throw ValidationException::withMessages(['payment_evidence_path' => 'Bukti pembayaran privat wajib tersedia.']);
        }
    }

    private function validateModern(PengajuanBebasAsrama $application): void
    {
        $checkout = $application->checkoutRequest;

        if (! $checkout
            || $checkout->status !== CheckoutRequestStatus::Selesai
            || $checkout->assetClearance?->status !== ClearanceStatus::Disetujui
            || $checkout->financeClearance?->status !== ClearanceStatus::Disetujui
            || (float) $checkout->financeClearance->outstanding_amount > 0) {
            throw ValidationException::withMessages(['checkout_request_id' => 'Checkout serta clearance aset dan keuangan harus selesai tanpa tunggakan.']);
        }
    }
}
