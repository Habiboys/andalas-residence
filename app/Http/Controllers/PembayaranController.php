<?php

namespace App\Http\Controllers;

use App\Actions\Billing\PostPayment;
use App\Enums\TagihanStatus;
use App\Models\DokumenTagihan;
use App\Models\KategoriTransaksi;
use App\Models\PaymentBankAccount;
use App\Models\Pembayaran;
use App\Models\Tagihan;
use App\Models\TransaksiKeuangan;
use App\Models\VirtualAccount;
use App\Services\AuditLogService;
use App\Services\ResidenceWorkflow;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PembayaranController extends Controller
{
    public function show(Request $request, Tagihan $tagihan, ResidenceWorkflow $workflow): Response
    {
        $student = $request->user()->mahasiswaProfil;
        abort_unless($student !== null && $tagihan->mahasiswa_id === $student->id, 403);

        $tagihan->load([
            'items',
            'jadwalCicilan',
            'dokumen',
            'registration.reservedRoom.lantai.gedung',
            'registration.placement.kamar.lantai.gedung',
            'registration.periode',
            'registration.policy',
            'registration.documents',
            'registration.decisions',
        ]);

        $registration = $tagihan->registration;
        $registrationData = null;
        if ($registration) {
            $registration->setAttribute('payment_unlocked', $workflow->paymentUnlocked($registration));
            $registration->setAttribute('blockers', $registration->completed_at ? [] : $workflow->blockers($registration));
            $registrationData = $registration;
        }

        return Inertia::render('mahasiswa/tagihan-detail', [
            'role' => 'mahasiswa',
            'page' => 'tagihan',
            'initialUser' => app(RolePageController::class)->userPayload($request),
            'invoice' => $tagihan,
            'payments' => Pembayaran::where('tagihan_id', $tagihan->id)->latest()->get(),
            'virtual_accounts' => VirtualAccount::where('mahasiswa_id', $student->id)->where('aktif', true)->get(),
            'payment_accounts' => PaymentBankAccount::where('is_active', true)->orderBy('bank_name')->orderBy('account_number')->get(),
            'registration' => $registrationData,
            'registrationUrl' => route('mahasiswa.registration'),
            'invoicesUrl' => route('mahasiswa.tagihan'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'pembayaran.create');

        $mhs = $request->user()->mahasiswaProfil;
        abort_unless($mhs !== null, 403);

        $validated = $request->validate([
            'tagihan_id' => ['required', 'uuid', Rule::exists('tagihan', 'id')->where('mahasiswa_id', $mhs->id)],
            'jenis_pembayaran' => 'required|in:sewa_asrama,cicilan,denda_kerusakan,lainnya',
            'nominal' => 'required|numeric|min:1',
            'termin_ke' => 'nullable|integer|min:1',
            'metode_pembayaran' => 'nullable|string|max:50',
            'payment_bank_account_id' => ['nullable', 'uuid', Rule::exists('payment_bank_accounts', 'id')->where('is_active', true)],
            'rekening_tujuan' => 'nullable|string|max:200',
            'nama_bank' => 'nullable|string|max:50',
            'nomor_rekening_pengirim' => 'nullable|string|max:50',
            'atas_nama_pengirim' => 'nullable|string|max:150',
            'tanggal_bayar' => 'nullable|date',
            'bukti_transfer' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        DB::transaction(function () use ($request, $validated, $mhs): void {
            $invoice = Tagihan::query()->lockForUpdate()->whereKey($validated['tagihan_id'])->firstOrFail();
            $remaining = (float) $invoice->total - (float) $invoice->total_dibayar;
            if (Pembayaran::where('tagihan_id', $invoice->id)->where('status', 'menunggu_verifikasi')->exists() || in_array($invoice->status, [TagihanStatus::Batal, TagihanStatus::Lunas], true)
                || (float) $validated['nominal'] > $remaining || (float) $validated['nominal'] <= 0) {
                throw ValidationException::withMessages(['nominal' => 'Nominal harus sesuai sisa tagihan yang belum lunas.']);
            }
            $scheduled = $invoice->jadwalCicilan()->where('status', '!=', 'diganti')->orderBy('termin_ke')->get();
            $nextDue = $remaining;
            $cumulative = 0.0;
            foreach ($scheduled as $term) {
                $cumulative += (float) $term->jumlah;
                if ($cumulative > (float) $invoice->total_dibayar) {
                    $nextDue = $cumulative - (float) $invoice->total_dibayar;
                    break;
                }
            }
            $nextDue = $invoice->amount_due_now !== null && (float) $invoice->amount_due_now > 0
                ? min($remaining, max(0.0, (float) $invoice->amount_due_now - (float) $invoice->total_dibayar))
                : $nextDue;
            if (abs((float) $validated['nominal'] - $nextDue) > 0.005) {
                throw ValidationException::withMessages(['nominal' => 'Bayar sesuai tagihan atau ajukan jadwal cicilan kepada admin layanan.']);
            }

            $registration = $invoice->registration;
            if ($registration) {
                if ($registration->isClosed()) {
                    throw ValidationException::withMessages(['tagihan_id' => 'Pendaftaran terkait tagihan ini telah dibatalkan atau ditolak.']);
                }
                if ($registration->workflow_version === 2 && ! app(ResidenceWorkflow::class)->paymentUnlocked($registration)) {
                    throw ValidationException::withMessages(['tagihan_id' => 'Pembayaran baru dapat dilakukan setelah seluruh berkas pendaftaran disetujui fasilitator gedung dan skema pembiayaan disetujui.']);
                }
                if (! $registration->completed_at && $registration->reservation_expires_at?->isPast()) {
                    throw ValidationException::withMessages(['tagihan_id' => 'Reservasi sudah kedaluwarsa. Silakan mendaftar kembali.']);
                }
            }
            $hasActiveVirtualAccount = VirtualAccount::where('mahasiswa_id', $mhs->id)->where('aktif', true)->exists();
            $hasActiveBankAccounts = PaymentBankAccount::where('is_active', true)->exists();
            if (($validated['metode_pembayaran'] ?? null) === 'transfer_bank' && empty($validated['payment_bank_account_id']) && empty($validated['rekening_tujuan']) && ! $hasActiveVirtualAccount) {
                throw ValidationException::withMessages([
                    'payment_bank_account_id' => $hasActiveBankAccounts
                        ? 'Pilih rekening tujuan transfer resmi asrama terlebih dahulu.'
                        : 'Rekening tujuan pembayaran asrama belum diisi oleh admin/pengelola. Pembayaran belum dapat dilakukan hingga rekening resmi tersedia.',
                ]);
            }

            $path = null;
            if ($request->hasFile('bukti_transfer')) {
                $path = $request->file('bukti_transfer')->store('bukti-pembayaran', 'local');
            }

            $targetAccount = ! empty($validated['payment_bank_account_id'])
                ? PaymentBankAccount::find($validated['payment_bank_account_id'])
                : null;
            $rekeningTujuan = $targetAccount
                ? "{$targetAccount->bank_name} · {$targetAccount->account_number} · a.n. {$targetAccount->account_name}"
                : ($validated['rekening_tujuan'] ?? null);

            Pembayaran::create([
                'kode_transaksi' => 'PAY-'.now()->format('YmdHis').'-'.strtoupper(Str::random(4)),
                'mahasiswa_id' => $mhs->id,
                'tagihan_id' => $invoice->id,
                'jenis_pembayaran' => $validated['jenis_pembayaran'],
                'nominal' => $validated['nominal'],
                'termin_ke' => $validated['termin_ke'] ?? 1,
                'metode_pembayaran' => $validated['metode_pembayaran'] ?? 'transfer_bank',
                'payment_bank_account_id' => $targetAccount?->id,
                'rekening_tujuan' => $rekeningTujuan,
                'nama_bank' => $validated['nama_bank'] ?? null,
                'nomor_rekening_pengirim' => $validated['nomor_rekening_pengirim'] ?? null,
                'atas_nama_pengirim' => $validated['atas_nama_pengirim'] ?? null,
                'bukti_transfer_path' => $path,
                'tanggal_bayar' => isset($validated['tanggal_bayar']) ? Carbon::parse($validated['tanggal_bayar']) : now(),
                'status' => 'menunggu_verifikasi',
            ]);

            if ($registration) {
                app(ResidenceWorkflow::class)->evaluate($registration->fresh());
            }
        });

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Pembayaran berhasil diajukan dan menunggu verifikasi admin.',
        ]);
    }

    public function verify(Request $request, Pembayaran $pembayaran, PostPayment $postPayment): RedirectResponse
    {
        $this->authorizePermission($request, 'pembayaran.verify');

        $validated = $request->validate([
            'status' => 'required|in:lunas,ditolak',
            'catatan_verifikasi' => 'nullable|string',
        ]);

        DB::transaction(function () use ($request, $pembayaran, $validated, $postPayment): void {
            $pembayaran = Pembayaran::query()->lockForUpdate()->findOrFail($pembayaran->id);
            if ($pembayaran->status === 'lunas') {
                if ($validated['status'] !== 'lunas') {
                    throw ValidationException::withMessages(['status' => 'Pembayaran yang sudah dibukukan tidak dapat ditolak.']);
                }

                return;
            }
            if ($pembayaran->status !== 'menunggu_verifikasi') {
                throw ValidationException::withMessages(['status' => 'Pembayaran ini sudah selesai diverifikasi.']);
            }
            if ($validated['status'] === 'lunas' && $pembayaran->tagihan_id) {
                $invoice = Tagihan::query()->lockForUpdate()->findOrFail($pembayaran->tagihan_id);
                if ($invoice->status === TagihanStatus::Batal || (float) $pembayaran->nominal > (float) $invoice->total - (float) $invoice->total_dibayar) {
                    throw ValidationException::withMessages(['status' => 'Nominal pembayaran melebihi sisa tagihan atau invoice sudah dibatalkan.']);
                }
                $postPayment->handle($pembayaran->kode_transaksi, $pembayaran->mahasiswa_id, ($pembayaran->tanggal_bayar ?? now())->toDateTimeString(), [
                    ['tagihan_id' => $invoice->id, 'jumlah' => $pembayaran->nominal],
                ]);
            }
            $pembayaran->update([
                'status' => $validated['status'],
                'catatan_verifikasi' => $validated['catatan_verifikasi'] ?? null,
                'diverifikasi_oleh' => $request->user()->id,
                'tanggal_bayar' => $validated['status'] === 'lunas' ? ($pembayaran->tanggal_bayar ?? now()) : $pembayaran->tanggal_bayar,
            ]);

            if ($registration = $pembayaran->tagihan?->registration) {
                $workflow = app(ResidenceWorkflow::class);
                $freshReg = $registration->fresh();
                if ($validated['status'] === 'ditolak') {
                    if (! $freshReg->completed_at && $freshReg->reservation_expires_at && $freshReg->reservation_expires_at->lt(now()->addHours(6))) {
                        $hours = max(24, (int) ($freshReg->periode?->reservation_hours ?? 24));
                        $freshReg->update(['reservation_expires_at' => now()->addHours($hours)]);
                        $freshReg->refresh();
                    }
                    $workflow->notify(
                        $freshReg,
                        'Bukti pembayaran ditolak',
                        trim((string) ($validated['catatan_verifikasi'] ?? '')) ?: 'Bukti pembayaran belum sesuai. Silakan periksa kembali dan unggah ulang bukti transfer yang valid.',
                    );
                } elseif ($validated['status'] === 'lunas') {
                    $workflow->notify(
                        $freshReg,
                        'Pembayaran diverifikasi (Lunas)',
                        'Pembayaran Anda sebesar Rp '.number_format((float) $pembayaran->nominal, 0, ',', '.').' telah disetujui oleh pengelola.',
                    );
                }
                $workflow->evaluate($freshReg);
            }
            if ($validated['status'] === 'lunas') {
                $kategori = KategoriTransaksi::where('tipe', 'pemasukan')
                    ->where('nama_kategori', 'like', '%Sewa%')
                    ->first()
                    ?? KategoriTransaksi::firstOrCreate(['nama_kategori' => 'Penerimaan Sewa Asrama', 'tipe' => 'pemasukan']);

                if (! TransaksiKeuangan::where('pembayaran_mahasiswa_id', $pembayaran->id)->exists()) {
                    TransaksiKeuangan::create([
                        'nomor_bukti' => 'TRX-PAY-'.$pembayaran->kode_transaksi,
                        'kategori_id' => $kategori->id,
                        'pembayaran_mahasiswa_id' => $pembayaran->id,
                        'tipe' => 'pemasukan',
                        'nominal' => $pembayaran->nominal,
                        'deskripsi' => 'Pembayaran '.$pembayaran->jenis_pembayaran.' — '.$pembayaran->kode_transaksi,
                        'tanggal_transaksi' => ($pembayaran->tanggal_bayar ?? now())->toDateString(),
                        'dicatat_oleh' => $request->user()->id,
                    ]);
                }
            }

        });

        AuditLogService::log($request->user(), 'verify_pembayaran', $pembayaran, null, $pembayaran->fresh()->toArray(), $request);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Pembayaran '.($validated['status'] === 'lunas' ? 'disetujui (lunas)' : 'ditolak').'.',
        ]);
    }

    public function document(Request $request, DokumenTagihan $document): StreamedResponse
    {
        abort_unless($request->user()->can('pembayaran.verify')
            || $document->tagihan->mahasiswa_id === $request->user()->mahasiswaProfil?->id, 403);
        abort_unless(Storage::disk('local')->exists($document->path), 404);

        return Storage::disk('local')->download($document->path, $document->nomor.'.pdf');
    }

    public function downloadBukti(Request $request, Pembayaran $pembayaran): StreamedResponse
    {
        abort_unless(
            $request->user()->can('pembayaran.download_bukti')
            || $pembayaran->mahasiswa_id === $request->user()->mahasiswaProfil?->id,
            403,
        );

        abort_unless($pembayaran->bukti_transfer_path !== null, 404);
        abort_unless(Storage::disk('local')->exists($pembayaran->bukti_transfer_path), 404);

        return Storage::disk('local')->response($pembayaran->bukti_transfer_path);
    }
}
