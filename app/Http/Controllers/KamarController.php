<?php

namespace App\Http\Controllers;

use App\Models\Kamar;
use App\Models\Lantai;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class KamarController extends Controller
{
    public function storeLantai(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');

        $validated = $request->validate([
            'gedung_id' => 'required|uuid|exists:gedung,id',
            'nomor_lantai' => 'required|integer|min:0',
            'nama_lantai' => 'required|string|max:100',
        ]);

        $lantai = Lantai::create($validated);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Lantai {$lantai->nama_lantai} berhasil ditambahkan.",
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');

        $validated = $request->validate([
            'lantai_id' => 'required|uuid|exists:lantai,id',
            'nomor_kamar' => 'required|string|max:20',
            'kapasitas' => 'required|integer|min:1|max:10',
            'tipe_kamar' => 'nullable|in:reguler,vip',
            'tarif_per_periode' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:kosong,terisi_sebagian,penuh,maintenance',
        ]);

        $kamar = Kamar::create([
            ...$validated,
            'status' => $validated['status'] ?? 'kosong',
            'tipe_kamar' => $validated['tipe_kamar'] ?? 'reguler',
        ]);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Kamar {$kamar->nomor_kamar} berhasil ditambahkan.",
        ]);
    }

    public function update(Request $request, Kamar $kamar): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');

        $validated = $request->validate([
            'nomor_kamar' => 'sometimes|string|max:20',
            'kapasitas' => 'sometimes|integer|min:1|max:10',
            'tipe_kamar' => 'sometimes|in:reguler,vip',
            'tarif_per_periode' => 'nullable|numeric|min:0',
            'status' => 'sometimes|in:kosong,terisi_sebagian,penuh,maintenance',
        ]);

        $kamar->update($validated);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Kamar {$kamar->nomor_kamar} diperbarui.",
        ]);
    }

    public function destroy(Request $request, Kamar $kamar): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');
        $kamar->delete();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Kamar dihapus.',
        ]);
    }
}
