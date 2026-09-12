<?php

namespace App\Http\Controllers;

use App\Models\Pembayaran;
use App\Models\TransaksiKeuangan;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class KeuanganController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'keuangan.view');

        return response()->json(TransaksiKeuangan::with(['kategori', 'pencatat'])->latest('tanggal_transaksi')->get());
    }

    public function dashboard(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'keuangan.view');

        $transaksi = TransaksiKeuangan::query()->get();
        $pemasukan = $transaksi->where('tipe', 'pemasukan')->sum('nominal');
        $pengeluaran = $transaksi->where('tipe', 'pengeluaran')->sum('nominal');
        $pembayaranPending = Pembayaran::where('status', 'menunggu_verifikasi')->sum('nominal');
        $pembayaranLunas = Pembayaran::where('status', 'lunas')->sum('nominal');

        return response()->json([
            'saldo' => $pemasukan - $pengeluaran,
            'pemasukan' => $pemasukan,
            'pengeluaran' => $pengeluaran,
            'pembayaran_pending' => $pembayaranPending,
            'pembayaran_lunas' => $pembayaranLunas,
            'jumlah_transaksi' => $transaksi->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'keuangan.create');

        $validated = $request->validate([
            'kategori_id' => 'required|uuid|exists:kategori_transaksi,id',
            'tanggal_transaksi' => 'required|date',
            'nominal' => 'required|numeric|min:1',
            'deskripsi' => 'nullable|string',
            'tipe' => 'required|in:pemasukan,pengeluaran',
        ]);

        $transaksi = TransaksiKeuangan::create([
            'nomor_bukti' => 'TRX-'.now()->format('YmdHis').'-'.strtoupper(Str::random(4)),
            'kategori_id' => $validated['kategori_id'],
            'tanggal_transaksi' => $validated['tanggal_transaksi'],
            'nominal' => $validated['nominal'],
            'deskripsi' => $validated['deskripsi'] ?? null,
            'tipe' => $validated['tipe'],
            'dicatat_oleh' => $request->user()->id,
        ]);

        AuditLogService::log($request->user(), 'create_transaksi', $transaksi, null, $transaksi->toArray(), $request);

        return response()->json($transaksi->load(['kategori', 'pencatat']), 201);
    }

    public function update(Request $request, TransaksiKeuangan $transaksi): JsonResponse
    {
        $this->authorizePermission($request, 'keuangan.update');

        $validated = $request->validate([
            'kategori_id' => 'sometimes|uuid|exists:kategori_transaksi,id',
            'tanggal_transaksi' => 'sometimes|date',
            'nominal' => 'sometimes|numeric|min:1',
            'deskripsi' => 'nullable|string',
            'tipe' => 'sometimes|in:pemasukan,pengeluaran',
        ]);

        $transaksi->update($validated);

        return response()->json($transaksi->fresh(['kategori', 'pencatat']));
    }

    public function destroy(Request $request, TransaksiKeuangan $transaksi): JsonResponse
    {
        $this->authorizePermission($request, 'keuangan.delete');
        $transaksi->delete();

        return response()->json(['ok' => true]);
    }
}
