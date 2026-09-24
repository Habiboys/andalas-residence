<?php

namespace App\Http\Controllers;

use App\Models\TransaksiKeuangan;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class KeuanganController extends Controller
{
    public function store(Request $request): RedirectResponse
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

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Transaksi {$transaksi->nomor_bukti} berhasil dicatat.",
        ]);
    }

    public function update(Request $request, TransaksiKeuangan $transaksi): RedirectResponse
    {
        $this->authorizePermission($request, 'keuangan.update');
        abort_if($transaksi->pembayaran_mahasiswa_id !== null, 403, 'Transaksi pembayaran mahasiswa tidak dapat diubah melalui buku kas.');

        $validated = $request->validate([
            'kategori_id' => 'sometimes|uuid|exists:kategori_transaksi,id',
            'tanggal_transaksi' => 'sometimes|date',
            'nominal' => 'sometimes|numeric|min:1',
            'deskripsi' => 'nullable|string',
            'tipe' => 'sometimes|in:pemasukan,pengeluaran',
        ]);

        $transaksi->update($validated);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Transaksi {$transaksi->nomor_bukti} diperbarui.",
        ]);
    }

    public function destroy(Request $request, TransaksiKeuangan $transaksi): RedirectResponse
    {
        $this->authorizePermission($request, 'keuangan.delete');
        abort_if($transaksi->pembayaran_mahasiswa_id !== null, 403, 'Transaksi pembayaran mahasiswa tidak dapat dihapus melalui buku kas.');
        $transaksi->delete();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Transaksi dihapus.',
        ]);
    }
}
