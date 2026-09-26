<?php

namespace App\Http\Controllers;

use App\Actions\ApproveFreeResidenceLetter;
use App\Actions\Billing\CreateLegacyInvoice;
use App\Actions\Billing\PostPayment;
use App\Enums\CheckoutRequestStatus;
use App\Enums\FreeResidenceLetterStatus;
use App\Enums\LegacyFreeResidenceVerificationPath;
use App\Models\CheckoutRequest;
use App\Models\MahasiswaProfil;
use App\Models\PengajuanBebasAsrama;
use App\Services\ResidenceLifecycle;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PengajuanController extends Controller
{
    public function storeBebas(Request $request, ApproveFreeResidenceLetter $approval): RedirectResponse
    {
        $this->authorizePermission($request, 'pengajuan.submit');
        $student = $request->user()->mahasiswaProfil;
        abort_unless($student && $student->angkatan, 403);
        $data = $request->validate([
            'alasan' => ['required', 'string', 'max:2000'],
            'payment_evidence' => ['required_with:bank_statement', 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'bank_statement' => ['required_with:payment_evidence', 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);
        DB::transaction(function () use ($request, $student, $data, $approval): void {
            $student = MahasiswaProfil::query()->lockForUpdate()->findOrFail($student->id);
            $life = app(ResidenceLifecycle::class);
            if ($student->penempatanKamar()->where('status', 'aktif')->exists()) {
                throw ValidationException::withMessages(['alasan' => 'Selesaikan check-out sebelum mengurus surat.']);
            }
            $checkout = CheckoutRequest::where('mahasiswa_id', $student->id)->where('status', CheckoutRequestStatus::Selesai)->latest('selesai_at')->first();
            $legacy = $life->legacy($student);
            $hasHistoricalEvidence = ! $checkout && $request->hasFile('payment_evidence') && $request->hasFile('bank_statement');
            $verificationPath = $hasHistoricalEvidence
                ? LegacyFreeResidenceVerificationPath::AlumniPaid
                : (($checkout || $life->hasStayed($student)) ? LegacyFreeResidenceVerificationPath::AlumniUnpaid : LegacyFreeResidenceVerificationPath::NotAlumni);
            $key = $checkout !== null ? $checkout->id : ($legacy !== null ? 'legacy-'.$legacy->id : 'never');
            $application = PengajuanBebasAsrama::where('mahasiswa_id', $student->id)->where('stay_key', $key)->latest()->first();
            if ($application?->status === FreeResidenceLetterStatus::Disetujui) {
                return;
            }
            if ($application?->status === FreeResidenceLetterStatus::Diajukan
                && $application->legacy_verification_path === LegacyFreeResidenceVerificationPath::AlumniPaid
                && ! $hasHistoricalEvidence) {
                return;
            }
            if ($application?->status === FreeResidenceLetterStatus::Diverifikasi && $application->tagihan_id && ! $hasHistoricalEvidence) {
                return;
            }
            $application ??= new PengajuanBebasAsrama(['nomor_pengajuan' => 'BA-'.Str::uuid(), 'mahasiswa_id' => $student->id]);
            $application->fill([
                'alasan' => $data['alasan'], 'lifecycle_year' => (int) $student->angkatan,
                'stay_key' => $key, 'checkout_request_id' => $checkout?->id, 'legacy_resident_id' => $legacy?->id,
                'legacy_verification_path' => $verificationPath,
                'document_kind' => $verificationPath === LegacyFreeResidenceVerificationPath::NotAlumni ? 'not_resident' : 'free_residence',
                'status' => FreeResidenceLetterStatus::Diajukan, 'catatan_penolakan' => null,
            ]);
            foreach (['payment_evidence', 'bank_statement'] as $field) {
                if ($hasHistoricalEvidence && $request->hasFile($field)) {
                    $path = $request->file($field)?->store('bebas-asrama/evidence', 'local');
                    if ($path !== false) {
                        $application->{$field.'_path'} = $path;
                    }
                }
            }
            $application->save();
            $application->statusHistories()->create(['status' => 'diajukan', 'changed_by' => $request->user()->id]);
            if ($verificationPath === LegacyFreeResidenceVerificationPath::NotAlumni || $checkout) {
                $application->update(['status' => FreeResidenceLetterStatus::Diverifikasi, 'verified_at' => now()]);
                $approval->handle($application->fresh(), null);
            } elseif ($legacy && $verificationPath === LegacyFreeResidenceVerificationPath::AlumniUnpaid) {
                app(CreateLegacyInvoice::class)->handle($application);
                $application->update(['status' => FreeResidenceLetterStatus::Diverifikasi, 'verified_at' => now()]);
                if (! $life->hasDebt($student)) {
                    $approval->handle($application->fresh(), null);
                }
            }
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Pengajuan tersimpan. Periksa hasil pemeriksaan dan tagihan pada akun Anda.']);
    }

    public function approveBebas(Request $request, PengajuanBebasAsrama $pengajuan, ApproveFreeResidenceLetter $approval): RedirectResponse
    {
        $this->authorizePermission($request, 'free-residence.review');
        $data = $request->validate([
            'status' => ['required', 'in:disetujui,ditolak'],
            'catatan_penolakan' => ['nullable', 'string', 'max:2000'],
            'nomor_surat_resmi' => ['nullable', 'string', 'max:100'],
        ]);
        DB::transaction(function () use ($request, $pengajuan, $data, $approval): void {
            $application = PengajuanBebasAsrama::query()->lockForUpdate()->findOrFail($pengajuan->id);
            if ($application->status === FreeResidenceLetterStatus::Disetujui) {
                return;
            }
            if ($data['status'] === 'ditolak') {
                $application->update(['status' => 'ditolak', 'catatan_penolakan' => $data['catatan_penolakan'] ?? 'Pengajuan bebas asrama ditolak. Silakan temui Admin Layanan di kantor Andalas Residence.']);
                $application->statusHistories()->create(['status' => 'ditolak', 'changed_by' => $request->user()->id]);

                return;
            }
            if ($application->legacy_verification_path !== LegacyFreeResidenceVerificationPath::NotAlumni && ! $application->checkout_request_id) {
                $invoice = app(CreateLegacyInvoice::class)->handle($application);
                if ($application->legacy_verification_path === LegacyFreeResidenceVerificationPath::AlumniPaid) {
                    if (! $application->payment_evidence_path || ! $application->bank_statement_path) {
                        throw ValidationException::withMessages(['payment_evidence' => 'Bukti pembayaran dan rekening koran wajib tersedia.']);
                    }
                    $remaining = (float) $invoice->total - (float) $invoice->total_dibayar;
                    if ($remaining > 0) {
                        app(PostPayment::class)->handle('HISTORICAL-'.$invoice->id, $application->mahasiswa_id, now()->toDateTimeString(), [
                            ['tagihan_id' => $invoice->id, 'jumlah' => $remaining],
                        ], metadata: ['source' => 'verified_historical_evidence', 'verified_by' => $request->user()->id]);
                    }
                }
            }
            $application->update(['status' => 'diverifikasi', 'verified_at' => now(), 'nomor_surat_resmi' => $data['nomor_surat_resmi'] ?? null]);
            if (! app(ResidenceLifecycle::class)->hasDebt($application->mahasiswa)) {
                $approval->handle($application->fresh(), $request->user());
            }
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Keputusan pengajuan tersimpan.']);
    }

    public function evidence(Request $request, PengajuanBebasAsrama $pengajuan, string $kind): StreamedResponse
    {
        $this->authorizePermission($request, 'free-residence.review');
        $path = match ($kind) {
            'payment' => $pengajuan->payment_evidence_path,
            'bank-statement' => $pengajuan->bank_statement_path,
            default => null,
        };
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path);
    }

    public function downloadSuratBebas(Request $request, PengajuanBebasAsrama $pengajuan): StreamedResponse
    {
        $this->authorizePermission($request, 'pengajuan.download_surat');

        abort_unless($request->user()->can('free-residence.review') || $pengajuan->mahasiswa_id === $request->user()->mahasiswaProfil?->id, 403);
        abort_unless($pengajuan->file_surat_path && Storage::disk('local')->exists($pengajuan->file_surat_path), 404);

        return Storage::disk('local')->download($pengajuan->file_surat_path, $pengajuan->nomor_pengajuan.'.pdf');
    }
}
