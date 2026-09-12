<?php

namespace App\Http\Controllers;

use App\Models\Aset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AsetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'aset.view');

        return response()->json(Aset::with(['kamar', 'fasilitasUmum'])->get());
    }

    public function store(Request $request): JsonResponse
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

        return response()->json(Aset::create([
            ...$validated,
            'kondisi' => $validated['kondisi'] ?? 'baik',
        ]), 201);
    }

    public function update(Request $request, Aset $aset): JsonResponse
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

        return response()->json($aset->fresh(['kamar']));
    }

    public function destroy(Request $request, Aset $aset): JsonResponse
    {
        $this->authorizePermission($request, 'aset.delete');
        $aset->delete();

        return response()->json(['ok' => true]);
    }
}
