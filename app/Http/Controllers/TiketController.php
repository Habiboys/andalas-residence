<?php

namespace App\Http\Controllers;

use App\Models\LaporanKerusakan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TiketController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'tiket.create');

        $validated = $request->validate([
            'aset_id' => 'nullable|uuid|exists:aset,id',
            'kamar_id' => 'nullable|uuid|exists:kamar,id',
            'deskripsi' => 'required|string',
        ]);

        $laporan = LaporanKerusakan::create([
            ...$validated,
            'nomor_tiket' => 'TKT-'.strtoupper(Str::random(8)),
            'dilaporkan_oleh' => $request->user()->id,
            'status' => 'menunggu_triage',
            'tanggal_lapor' => now(),
        ]);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Tiket {$laporan->nomor_tiket} berhasil dibuat.",
        ]);
    }

    public function update(Request $request, LaporanKerusakan $laporan): RedirectResponse
    {
        $this->authorizePermission($request, 'tiket.update');

        $validated = $request->validate([
            'status' => 'required|in:didisposisikan,sedang_dikerjakan,selesai,dibatalkan',
            'catatan_penyelesaian' => 'nullable|string',
            'metode_penanganan' => 'nullable|in:perbaikan,penggantian',
            'biaya_riil' => 'nullable|numeric',
        ]);

        if ($request->user()->hasRole('teknisi') && ! $laporan->teknisi_id) {
            $validated['teknisi_id'] = $request->user()->id;
        }

        if ($validated['status'] === 'selesai') {
            $validated['tanggal_selesai'] = now();
        }

        $laporan->update($validated);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Tiket {$laporan->nomor_tiket} diperbarui.",
        ]);
    }
}
