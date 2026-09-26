<?php

namespace App\Http\Controllers;

use App\Actions\Billing\PostPayment;
use App\Enums\TagihanStatus;
use App\Models\DokumenTagihan;
use App\Models\KategoriTransaksi;
use App\Models\Pembayaran;
use App\Models\Tagihan;
use App\Models\TransaksiKeuangan;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PembayaranController extends Controller
{
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
            'nama_bank' => 'nullable|string|max:50',
            'nomor_rekening_pengirim' => 'nullable|string|max:50',
            'atas_nama_pengirim' => 'nullable|string|max:150',
            'bukti_transfer' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        DB::transaction(function () use ($request, $validated, $mhs): void {
            $invoice = Tagihan::query()->lockForUpdate()->whereKey($validated['tagihan_id'])->firstOrFail();
            $remaining = (float) $invoice->total - (float) $invoice->total_dibayar;
            if (Pembayaran::where('tagihan_id', $invoice->id)->where('status', 'menunggu_verifikasi')->exists() || in_array($invoice->status, [TagihanStatus::Batal, TagihanStatus::Lunas], true)
                || (float) $validated['nominal'] > $remaining || (float) $validated['nominal'] <= 0) {
                throw ValidationException::withMessages(['nominal' => 'Nominal harus sesuai sisa tagihan yang belum lunas.']);
            }
            $scheduled = $invoice->jadwalCicilan()->orderBy('termin_ke')->get();
            $nextDue = $remaining;
            $cumulative = 0.0;
            foreach ($scheduled as $term) {
                $cumulative += (float) $term->jumlah;
                if ($cumulative > (float) $invoice->total_dibayar) {
                    $nextDue = $cumulative - (float) $invoice->total_dibayar;
                    break;
                }
            }
            $nextDue = $invoice->amount_due_now !== null ? min($remaining, (float) $invoice->amount_due_now) : $nextDue;
            if (abs((float) $validated['nominal'] - $nextDue) > 0.005) {
                throw ValidationException::withMessages(['nominal' => 'Bayar sesuai tagihan atau ajukan jadwal cicilan kepada admin layanan.']);
            }

            $registration = $invoice->registration;
            if ($registration && ! $registration->completed_at && $registration->reservation_expires_at?->isPast()) {
                throw ValidationException::withMessages(['tagihan_id' => 'Reservasi sudah kedaluwarsa. Silakan mendaftar kembali.']);
            }
            $path = null;
            if ($request->hasFile('bukti_transfer')) {
                $path = $request->file('bukti_transfer')->store('bukti-pembayaran', 'local');
            }

            $pembayaran = Pembayaran::create([
                'kode_transaksi' => 'PAY-'.now()->format('YmdHis').'-'.strtoupper(Str::random(4)),
                'mahasiswa_id' => $mhs->id,
                'tagihan_id' => $invoice->id,
                'jenis_pembayaran' => $validated['jenis_pembayaran'],
                'nominal' => $validated['nominal'],
                'termin_ke' => $validated['termin_ke'] ?? 1,
                'metode_pembayaran' => $validated['metode_pembayaran'] ?? 'transfer_bank',
                'nama_bank' => $validated['nama_bank'] ?? null,
                'nomor_rekening_pengirim' => $validated['nomor_rekening_pengirim'] ?? null,
                'atas_nama_pengirim' => $validated['atas_nama_pengirim'] ?? null,
                'bukti_transfer_path' => $path,
                'status' => 'menunggu_verifikasi',
            ]);

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
                $postPayment->handle($pembayaran->kode_transaksi, $pembayaran->mahasiswa_id, now()->toDateTimeString(), [
                    ['tagihan_id' => $invoice->id, 'jumlah' => $pembayaran->nominal],
                ]);
            }
            $pembayaran->update([
                'status' => $validated['status'],
                'catatan_verifikasi' => $validated['catatan_verifikasi'] ?? null,
                'diverifikasi_oleh' => $request->user()->id,
                'tanggal_bayar' => $validated['status'] === 'lunas' ? now() : $pembayaran->tanggal_bayar,
            ]);

            if ($validated['status'] === 'lunas') {
                $kategori = KategoriTransaksi::where('tipe', 'pemasukan')
                    ->where('nama_kategori', 'like', '%Sewa%')
                    ->first();

                if ($kategori && ! TransaksiKeuangan::where('pembayaran_mahasiswa_id', $pembayaran->id)->exists()) {
                    TransaksiKeuangan::create([
                        'nomor_bukti' => 'TRX-PAY-'.$pembayaran->kode_transaksi,
                        'kategori_id' => $kategori->id,
                        'pembayaran_mahasiswa_id' => $pembayaran->id,
                        'tipe' => 'pemasukan',
                        'nominal' => $pembayaran->nominal,
                        'deskripsi' => 'Pembayaran '.$pembayaran->jenis_pembayaran.' — '.$pembayaran->kode_transaksi,
                        'tanggal_transaksi' => now()->toDateString(),
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
        $this->authorizePermission($request, 'pembayaran.download_bukti');

        abort_unless($pembayaran->bukti_transfer_path !== null, 404);
        abort_unless(Storage::disk('local')->exists($pembayaran->bukti_transfer_path), 404);

        return Storage::disk('local')->response($pembayaran->bukti_transfer_path);
    }
}
