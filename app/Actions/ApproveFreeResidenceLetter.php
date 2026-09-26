<?php

namespace App\Actions;

use App\Enums\CheckoutRequestStatus;
use App\Enums\FreeResidenceLetterStatus;
use App\Enums\LegacyFreeResidenceVerificationPath;
use App\Enums\TagihanStatus;
use App\Jobs\GenerateFreeResidenceLetter;
use App\Models\DocumentSigner;
use App\Models\PengajuanBebasAsrama;
use App\Models\Tagihan;
use App\Models\User;
use App\Services\FreeResidenceLetterFormat;
use App\Services\ResidenceLifecycle;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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

            $settledRejection = $application->status === FreeResidenceLetterStatus::Ditolak
                && $application->legacy_verification_path === LegacyFreeResidenceVerificationPath::AlumniUnpaid
                && $application->tagihan?->status === TagihanStatus::Lunas;
            if ($application->status !== FreeResidenceLetterStatus::Diverifikasi && ! $settledRejection) {
                throw ValidationException::withMessages(['status' => 'Pengajuan harus diverifikasi sebelum disetujui.']);
            }

            $student = $application->mahasiswa()->lockForUpdate()->firstOrFail();
            $signer = $this->activeSigner();
            $life = app(ResidenceLifecycle::class);
            if ($student->penempatanKamar()->where('status', 'aktif')->exists() || $life->hasDebt($student)) {
                throw ValidationException::withMessages(['status' => 'Hunian harus berakhir dan seluruh tagihan pribadi harus lunas.']);
            }
            if ($application->legacy_verification_path === LegacyFreeResidenceVerificationPath::NotAlumni) {
                if ($life->hasStayed($student)) {
                    throw ValidationException::withMessages(['status' => 'Riwayat hunian ditemukan. Gunakan jalur alumni.']);
                }
                $application->document_kind = 'not_resident';
            } elseif ($application->checkout_request_id) {
                $this->validateModern($application);
                $application->document_kind = 'free_residence';
            } else {
                $this->validateLegacy($application);
                $application->document_kind = 'free_residence';
            }
            $application->approved_at = now();
            $snapshot = app(FreeResidenceLetterFormat::class)->data($application);
            $snapshot['issuedAt'] = $snapshot['issuedAt']->toIso8601String();
            $snapshot['nama'] = $student->user->nama;
            $snapshot['nim'] = $student->user->nim_nip;
            $snapshot['signer'] = $signer['nama'];
            $snapshot['signerNip'] = $signer['nip'];
            $snapshot['signerJabatan'] = $signer['jabatan'];
            $snapshot['signerUnit'] = $signer['unit'];
            $application->document_snapshot = $snapshot;

            $application->update([
                'status' => FreeResidenceLetterStatus::Disetujui,
                'disetujui_oleh' => $approver?->id,
                'approved_at' => now(),
            ]);
            $application->statusHistories()->create([
                'status' => FreeResidenceLetterStatus::Disetujui,
                'changed_by' => $approver?->id,
            ]);
            $application->mahasiswa->user->update(['status' => 'nonaktif', 'inactive_reason' => 'letter_issued']);
            $intent = $application->documentIntent()->firstOrCreate([], [
                'status' => 'pending',
                'requested_at' => now(),
                'verification_token' => (string) Str::uuid(),
                'signer_name' => $signer['nama'],
                'signer_nip' => $signer['nip'],
            ]);
            GenerateFreeResidenceLetter::dispatch($intent->id)->afterCommit();

            return $application->fresh(['statusHistories', 'documentIntent']);
        });
    }

    /** @return array{nama: string, nip: ?string, jabatan: string, unit: string} */
    private function activeSigner(): array
    {
        $signer = DocumentSigner::aktif();

        return [
            'nama' => $signer?->nama ?? (string) config('residence.letter_signer'),
            'nip' => $signer?->nip,
            'jabatan' => $signer?->jabatan ?? 'Pengelola Asrama',
            'unit' => $signer?->unit ?? 'Universitas Andalas',
        ];
    }

    private function validateLegacy(PengajuanBebasAsrama $application): void
    {
        if (! app(ResidenceLifecycle::class)->legacy($application->mahasiswa)) {
            throw ValidationException::withMessages(['legacy' => 'Lengkapi arsip alumni lama terlebih dahulu.']);
        }
        if (! $application->tagihan || $application->tagihan->status !== TagihanStatus::Lunas) {
            throw ValidationException::withMessages(['tagihan_id' => 'Tagihan alumni harus lunas.']);
        }
        if ($application->legacy_verification_path === LegacyFreeResidenceVerificationPath::AlumniPaid
            && (! $application->payment_evidence_path || ! $application->bank_statement_path)) {
            throw ValidationException::withMessages(['payment_evidence_path' => 'Bukti pembayaran dan rekening koran wajib tersedia.']);
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
