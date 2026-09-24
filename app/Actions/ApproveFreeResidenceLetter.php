<?php

namespace App\Actions;

use App\Enums\CheckoutRequestStatus;
use App\Enums\FreeResidenceLetterStatus;
use App\Enums\LegacyFreeResidenceVerificationPath;
use App\Enums\TagihanStatus;
use App\Jobs\GenerateFreeResidenceLetter;
use App\Models\PengajuanBebasAsrama;
use App\Models\Tagihan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApproveFreeResidenceLetter
{
    public function handle(PengajuanBebasAsrama $pengajuan, ?User $approver): PengajuanBebasAsrama
    {
        return DB::transaction(function () use ($pengajuan, $approver): PengajuanBebasAsrama {
            $application = PengajuanBebasAsrama::query()
                ->with(['checkoutRequest'])
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
                'disetujui_oleh' => $approver?->id,
                'approved_at' => now(),
            ]);
            $application->statusHistories()->create([
                'status' => FreeResidenceLetterStatus::Disetujui,
                'changed_by' => $approver?->id,
            ]);
            $application->mahasiswa->user->update(['status' => 'nonaktif']);
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
        if ($application->mahasiswa->penempatanKamar()->where('status', 'aktif')->exists()
            || Tagihan::where('mahasiswa_id', $application->mahasiswa_id)->where('status', '!=', TagihanStatus::Batal)->whereColumn('total', '>', 'total_dibayar')->exists()) {
            throw ValidationException::withMessages(['status' => 'Hunian harus berakhir dan semua tagihan dalam sistem harus lunas sebelum surat diterbitkan.']);
        }

        if (! $application->legacy_verification_path) {
            throw ValidationException::withMessages(['legacy_verification_path' => 'Jalur verifikasi admin wajib dipilih.']);
        }

        if ($application->legacy_verification_path === LegacyFreeResidenceVerificationPath::AlumniPaid
            && (! $application->payment_evidence_path || ! $application->bank_statement_path)) {
            throw ValidationException::withMessages(['payment_evidence_path' => 'Bukti pembayaran dan rekening koran wajib tersedia.']);
        }

        if ($application->legacy_verification_path === LegacyFreeResidenceVerificationPath::AlumniUnpaid
            && (! $application->tagihan || $application->tagihan->status !== TagihanStatus::Lunas)) {
            throw ValidationException::withMessages(['tagihan_id' => 'Tagihan alumni harus dilunasi sebelum surat diterbitkan.']);
        }

        if ($application->legacy_verification_path === LegacyFreeResidenceVerificationPath::NotAlumni
            && ($application->mahasiswa->penempatanKamar()->exists() || $application->mahasiswa->residenceHistories()->exists())) {
            throw ValidationException::withMessages(['legacy_verification_path' => 'Riwayat hunian ditemukan. Mahasiswa tercatat sebagai alumni asrama.']);
        }
    }

    private function validateModern(PengajuanBebasAsrama $application): void
    {
        $checkout = $application->checkoutRequest;

        if (! $checkout || $checkout->mahasiswa_id !== $application->mahasiswa_id
            || $checkout->status !== CheckoutRequestStatus::Selesai
            || $application->mahasiswa->penempatanKamar()->where('status', 'aktif')->exists()
            || Tagihan::where('mahasiswa_id', $application->mahasiswa_id)->where('status', '!=', TagihanStatus::Batal)
                ->whereColumn('total', '>', 'total_dibayar')->exists()) {
            throw ValidationException::withMessages(['checkout_request_id' => 'Checkout harus selesai dan seluruh tagihan harus lunas.']);
        }
    }
}
