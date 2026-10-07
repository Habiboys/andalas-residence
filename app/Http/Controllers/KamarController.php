<?php

namespace App\Http\Controllers;

use App\Models\Kamar;
use App\Models\Lantai;
use App\Services\RoomEligibility;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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

    public function updateLantai(Request $request, Lantai $lantai): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');

        $validated = $request->validate([
            'nomor_lantai' => 'sometimes|integer|min:0',
            'nama_lantai' => 'sometimes|string|max:100',
        ]);

        $lantai->update($validated);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Lantai {$lantai->nama_lantai} diperbarui.",
        ]);
    }

    public function destroyLantai(Request $request, Lantai $lantai): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');

        if ($lantai->kamar()->whereHas('penempatanKamar')->exists()) {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => "Lantai {$lantai->nama_lantai} tidak dapat dihapus karena ada kamar yang berisi penghuni.",
            ]);
        }

        $buildingId = $lantai->gedung_id;
        $lantai->delete();

        return redirect()->route('andalas.gedung.show', $buildingId)->with('toast', [
            'type' => 'success',
            'message' => 'Lantai dihapus.',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');

        $validated = $request->validate([
            'lantai_id' => 'required|uuid|exists:lantai,id',
            'nomor_kamar' => 'required|string|max:20',
            'kapasitas' => 'required|integer|min:1|max:10',
            'tipe_kamar' => 'nullable|in:standar,medium,premium,umum,umum_vip',
            'tarif_per_periode' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:kosong,terisi_sebagian,penuh,maintenance',
        ]);

        $building = Lantai::findOrFail($validated['lantai_id'])->gedung;
        if (! RoomEligibility::allowsType($building, $validated['tipe_kamar'] ?? 'standar', (int) $validated['kapasitas'])) {
            throw ValidationException::withMessages(['tipe_kamar' => 'Tipe tidak aktif atau kapasitas melebihi batas master tipe gedung.']);
        }
        $kamar = Kamar::create([
            ...$validated,
            'status' => $validated['status'] ?? 'kosong',
            'tipe_kamar' => $validated['tipe_kamar'] ?? 'standar',
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
            'tipe_kamar' => 'sometimes|in:standar,medium,premium,umum,umum_vip',
            'tarif_per_periode' => 'nullable|numeric|min:0',
            'status' => 'sometimes|in:kosong,terisi_sebagian,penuh,maintenance',
        ]);

        if (! RoomEligibility::allowsType($kamar->lantai->gedung, $validated['tipe_kamar'] ?? $kamar->tipe_kamar, (int) ($validated['kapasitas'] ?? $kamar->kapasitas))) {
            throw ValidationException::withMessages(['tipe_kamar' => 'Tipe tidak aktif atau kapasitas melebihi batas master tipe gedung.']);
        }
        $kamar->update($validated);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Kamar {$kamar->nomor_kamar} diperbarui.",
        ]);
    }

    public function destroy(Request $request, Kamar $kamar): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');

        if ($kamar->penempatanKamar()->exists()) {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => "Kamar {$kamar->nomor_kamar} tidak dapat dihapus karena berisi penghuni.",
            ]);
        }

        $floorId = $kamar->lantai_id;
        $kamar->delete();

        return redirect()->route('andalas.lantai.show', $floorId)->with('toast', [
            'type' => 'success',
            'message' => 'Kamar dihapus.',
        ]);
    }
}
