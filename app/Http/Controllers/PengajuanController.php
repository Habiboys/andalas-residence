<?php

namespace App\Http\Controllers;

use App\Actions\ApproveFreeResidenceLetter;
use App\Actions\Billing\CreateTagihan;
use App\Enums\CheckoutRequestStatus;
use App\Enums\FreeResidenceLetterStatus;
use App\Enums\LegacyFreeResidenceVerificationPath;
use App\Enums\TagihanStatus;
use App\Models\CheckoutRequest;
use App\Models\LegacyResidenceRate;
use App\Models\MahasiswaProfil;
use App\Models\PengajuanBebasAsrama;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PengajuanController extends Controller
{
    public function storeBebas(Request $request, ApproveFreeResidenceLetter $approval): RedirectResponse
    {
        $this->authorizePermission($request, 'pengajuan.submit');

        $mhs = $request->user()->mahasiswaProfil;
        abort_unless($mhs, 403);

        $validated = $request->validate([
            'alasan' => ['required', 'string', 'max:2000'],
            'bank_statement' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'payment_evidence' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);
        if (! $mhs->angkatan) {
            throw ValidationException::withMessages(['alasan' => 'Lengkapi angkatan mahasiswa sebelum mengajukan surat.']);
        }
        $lifecycleYear = (int) $mhs->angkatan;
        $pengajuan = DB::transaction(function () use ($request, $mhs, $validated, $lifecycleYear, $approval): PengajuanBebasAsrama {
            $mhs = MahasiswaProfil::query()->lockForUpdate()->findOrFail($mhs->id);
            $existing = PengajuanBebasAsrama::where('mahasiswa_id', $mhs->id)->latest()->first();
            if ($existing?->status === FreeResidenceLetterStatus::Disetujui) {
                return $existing;
            }
            $paths = [
                'payment_evidence_path' => $request->file('payment_evidence')?->store('bebas-asrama/evidence', 'local'),
                'bank_statement_path' => $request->file('bank_statement')?->store('bebas-asrama/evidence', 'local'),
            ];
            $pengajuan = $existing ?? new PengajuanBebasAsrama;
            $pengajuan->fill([
                'nomor_pengajuan' => $existing?->nomor_pengajuan ?? 'BA-'.now()->format('Ymd').'-'.strtoupper(Str::random(4)),
                'mahasiswa_id' => $mhs->id,
                'alasan' => $validated['alasan'],
                'lifecycle_year' => $lifecycleYear,
                ...array_filter($paths),
                'status' => $existing?->status === FreeResidenceLetterStatus::Ditolak ? FreeResidenceLetterStatus::Diajukan : ($existing?->status ?? FreeResidenceLetterStatus::Diajukan),
                'catatan_penolakan' => null,
            ])->save();
            if (! $existing) {
                $pengajuan->statusHistories()->create(['status' => FreeResidenceLetterStatus::Diajukan, 'changed_by' => $request->user()->id]);
            }
            if ($lifecycleYear >= 2026) {
                $checkout = CheckoutRequest::where('mahasiswa_id', $mhs->id)->where('status', CheckoutRequestStatus::Selesai)->latest('selesai_at')->first();
                $pengajuan->update(['checkout_request_id' => $checkout?->id, 'status' => FreeResidenceLetterStatus::Diverifikasi, 'verified_at' => now()]);
                $approval->handle($pengajuan, null);
            }

            return $pengajuan;
        });

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Pengajuan berhasil: {$pengajuan->nomor_pengajuan}",
        ]);
    }

    public function approveBebas(Request $request, PengajuanBebasAsrama $pengajuan, ApproveFreeResidenceLetter $approval, CreateTagihan $createTagihan): RedirectResponse
    {
        $this->authorizePermission($request, 'free-residence.review');

        $validated = $request->validate([
            'status' => 'required|in:disetujui,ditolak',
            'catatan_penolakan' => 'required_if:status,ditolak|nullable|string',
            'nomor_surat_resmi' => 'nullable|string|max:100',
            'legacy_verification_path' => ['nullable', Rule::enum(LegacyFreeResidenceVerificationPath::class)],
            'jumlah_tagihan_angkatan' => ['nullable', 'numeric', 'min:1'],
        ]);

        DB::transaction(function () use ($request, $pengajuan, $validated, $approval, $createTagihan): void {
            $pengajuan = PengajuanBebasAsrama::query()->lockForUpdate()->findOrFail($pengajuan->id);
            if ($pengajuan->status === FreeResidenceLetterStatus::Disetujui) {
                throw ValidationException::withMessages(['status' => 'Surat yang sudah diterbitkan tidak dapat diubah.']);
            }
            if ($validated['status'] === FreeResidenceLetterStatus::Ditolak->value) {
                $pengajuan->statusHistories()->create(['status' => FreeResidenceLetterStatus::Ditolak, 'changed_by' => $request->user()->id, 'note' => $validated['catatan_penolakan'] ?? null]);
                $pengajuan->update([
                    'status' => FreeResidenceLetterStatus::Ditolak,
                    'catatan_penolakan' => $validated['catatan_penolakan'] ?? null,
                    'disetujui_oleh' => $request->user()->id,
                    'nomor_surat_resmi' => $validated['nomor_surat_resmi'] ?? $pengajuan->nomor_surat_resmi,
                ]);
            } else {
                if ($pengajuan->lifecycle_year <= 2025) {
                    $path = $validated['legacy_verification_path'] ?? $pengajuan->legacy_verification_path?->value;
                    if (! $path) {
                        throw ValidationException::withMessages(['legacy_verification_path' => 'Tentukan status alumni berdasarkan verifikasi admin.']);
                    }
                    if ($path === LegacyFreeResidenceVerificationPath::NotAlumni->value
                        && ($pengajuan->mahasiswa->penempatanKamar()->exists() || $pengajuan->mahasiswa->residenceHistories()->exists())) {
                        $message = 'Riwayat hunian ditemukan. Anda tercatat sebagai alumni asrama; pengajuan bukan alumni ditolak.';
                        $pengajuan->update(['status' => FreeResidenceLetterStatus::Ditolak, 'catatan_penolakan' => $message, 'disetujui_oleh' => $request->user()->id]);
                        $pengajuan->statusHistories()->create(['status' => FreeResidenceLetterStatus::Ditolak, 'changed_by' => $request->user()->id, 'note' => $message]);

                        return;
                    }
                    if ($pengajuan->tagihan_id && $pengajuan->legacy_verification_path?->value !== $path) {
                        throw ValidationException::withMessages(['legacy_verification_path' => 'Klasifikasi dengan tagihan yang sudah diterbitkan tidak dapat diubah. Selesaikan tagihan terlebih dahulu.']);
                    }
                    $pengajuan->update(['legacy_verification_path' => $path]);
                    if ($path === LegacyFreeResidenceVerificationPath::AlumniUnpaid->value && ! $pengajuan->tagihan_id) {
                        if (isset($validated['jumlah_tagihan_angkatan'])) {
                            LegacyResidenceRate::updateOrCreate(['angkatan' => $pengajuan->lifecycle_year], ['jumlah' => $validated['jumlah_tagihan_angkatan']]);
                        }
                        $rate = LegacyResidenceRate::where('angkatan', $pengajuan->lifecycle_year)->first();
                        if (! $rate) {
                            throw ValidationException::withMessages(['jumlah_tagihan_angkatan' => 'Tetapkan tarif tagihan untuk angkatan ini.']);
                        }
                        $invoice = $createTagihan->handle($pengajuan->mahasiswa, 'ALUMNI-'.$pengajuan->id, [
                            ['deskripsi' => 'Pelunasan asrama angkatan '.$pengajuan->lifecycle_year, 'kuantitas' => 1, 'harga_satuan' => $rate->jumlah],
                        ]);
                        $invoice->update(['status' => TagihanStatus::Terbit, 'tanggal_terbit' => now()]);
                        $pengajuan->update(['tagihan_id' => $invoice->id]);
                    }
                }
                $pengajuan->update(['status' => FreeResidenceLetterStatus::Diverifikasi, 'verified_at' => now()]);
                $pengajuan->statusHistories()->create(['status' => FreeResidenceLetterStatus::Diverifikasi, 'changed_by' => $request->user()->id]);
                if ($pengajuan->legacy_verification_path === LegacyFreeResidenceVerificationPath::AlumniUnpaid
                    && $pengajuan->tagihan?->status !== TagihanStatus::Lunas) {
                    return;
                }
                if ($pengajuan->legacy_verification_path === LegacyFreeResidenceVerificationPath::AlumniPaid
                    && (! $pengajuan->payment_evidence_path || ! $pengajuan->bank_statement_path)) {
                    return;
                }
                $approval->handle($pengajuan->fresh(), $request->user());
            }

        });

        AuditLogService::log($request->user(), 'approve_pengajuan_bebas', $pengajuan, null, $pengajuan->fresh()->toArray(), $request);

        return redirect()->back()->with('toast', [
            'type' => $pengajuan->fresh()->status === FreeResidenceLetterStatus::Ditolak ? 'error' : 'success',
            'message' => $pengajuan->fresh()->status === FreeResidenceLetterStatus::Ditolak ? $pengajuan->fresh()->catatan_penolakan : ($pengajuan->fresh()->status === FreeResidenceLetterStatus::Diverifikasi ? 'Status alumni diverifikasi. Lengkapi bukti pembayaran dan rekening koran atau lunasi tagihan sesuai hasil verifikasi.' : 'Pengajuan bebas asrama berhasil '.($validated['status'] === FreeResidenceLetterStatus::Disetujui->value ? 'disetujui' : 'ditolak').'.'),
        ]);
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

    public function downloadSuratBebas(Request $request, PengajuanBebasAsrama $pengajuan)
    {
        $this->authorizePermission($request, 'pengajuan.download_surat');

        abort_unless($request->user()->can('free-residence.review') || $pengajuan->mahasiswa_id === $request->user()->mahasiswaProfil?->id, 403);
        abort_unless($pengajuan->file_surat_path && Storage::disk('local')->exists($pengajuan->file_surat_path), 404);

        return Storage::disk('local')->download($pengajuan->file_surat_path, $pengajuan->nomor_pengajuan.'.pdf');
    }
}
