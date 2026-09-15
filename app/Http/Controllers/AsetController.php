<?php

namespace App\Http\Controllers;

use App\Models\Aset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AsetController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'aset.create');

        $validated = $request->validate([
            'kamar_id' => 'nullable|uuid|exists:kamar,id',
            'kode_inventaris' => 'required|string|max:50|unique:aset,kode_inventaris',
            'nama_aset' => 'required|string|max:150',
            'kategori' => 'required|string|max:100',
            'kondisi' => 'nullable|in:baik,rusak_ringan,rusak_berat,hilang',
            'nilai_aset' => 'nullable|numeric|min:0',
        ]);

        $aset = Aset::create([
            ...$validated,
            'kondisi' => $validated['kondisi'] ?? 'baik',
        ]);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Aset {$aset->nama_aset} berhasil ditambahkan.",
        ]);
    }

    public function update(Request $request, Aset $aset): RedirectResponse
    {
        $this->authorizePermission($request, 'aset.update');

        $validated = $request->validate([
            'kamar_id' => 'nullable|uuid|exists:kamar,id',
            'kode_inventaris' => 'sometimes|string|max:50|unique:aset,kode_inventaris,'.$aset->id,
            'nama_aset' => 'sometimes|string|max:150',
            'kategori' => 'sometimes|string|max:100',
            'kondisi' => 'sometimes|in:baik,rusak_ringan,rusak_berat,hilang',
            'nilai_aset' => 'nullable|numeric|min:0',
        ]);

        $aset->update($validated);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Aset {$aset->nama_aset} diperbarui.",
        ]);
    }

    public function destroy(Request $request, Aset $aset): RedirectResponse
    {
        $this->authorizePermission($request, 'aset.delete');
        $aset->delete();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Aset dihapus.',
        ]);
    }
}
