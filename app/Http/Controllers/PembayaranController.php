<?php

namespace App\Http\Controllers;

use App\Models\KategoriTransaksi;
use App\Models\Pembayaran;
use App\Models\TransaksiKeuangan;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PembayaranController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'pembayaran.view');

        $query = Pembayaran::with(['mahasiswa.user', 'verifikator']);

        if ($request->user()->hasRole('mahasiswa')) {
            $query->where('mahasiswa_id', $request->user()->mahasiswaProfil?->id);
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'pembayaran.create');

        $mhs = $request->user()->mahasiswaProfil;
        abort_unless($mhs, 403);

        $validated = $request->validate([
            'checkin_id' => 'nullable|uuid|exists:checkin,id',
            'jenis_pembayaran' => 'required|in:sewa_asrama,cicilan,denda_kerusakan,lainnya',
            'nominal' => 'required|numeric|min:1',
            'termin_ke' => 'nullable|integer|min:1',
            'metode_pembayaran' => 'nullable|string|max:50',
            'nama_bank' => 'nullable|string|max:50',
            'nomor_rekening_pengirim' => 'nullable|string|max:50',
            'atas_nama_pengirim' => 'nullable|string|max:150',
            'bukti_transfer' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $path = null;
        if ($request->hasFile('bukti_transfer')) {
            $path = $request->file('bukti_transfer')->store('bukti-pembayaran', 'local');
        }

        $pembayaran = Pembayaran::create([
            'kode_transaksi' => 'PAY-'.now()->format('YmdHis').'-'.strtoupper(Str::random(4)),
            'mahasiswa_id' => $mhs->id,
            'checkin_id' => $validated['checkin_id'] ?? null,
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

        return response()->json($pembayaran, 201);
    }

    public function verify(Request $request, Pembayaran $pembayaran): JsonResponse
    {
        $this->authorizePermission($request, 'pembayaran.verify');

        $validated = $request->validate([
            'status' => 'required|in:lunas,ditolak',
            'catatan_verifikasi' => 'nullable|string',
        ]);

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

            $pembayaran->mahasiswa?->update(['status_huni' => 'aktif']);
        }

        AuditLogService::log($request->user(), 'verify_pembayaran', $pembayaran, null, $pembayaran->fresh()->toArray(), $request);

        return response()->json($pembayaran->fresh(['mahasiswa.user', 'verifikator']));
    }

    public function downloadBukti(Request $request, Pembayaran $pembayaran)
    {
        $this->authorizePermission($request, 'pembayaran.download_bukti');

        abort_unless($pembayaran->bukti_transfer_path, 404);
        abort_unless(Storage::disk('local')->exists($pembayaran->bukti_transfer_path), 404);

        return Storage::disk('local')->response($pembayaran->bukti_transfer_path);
    }
}
