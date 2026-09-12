<?php

namespace App\Http\Controllers;

use App\Models\Kamar;
use App\Models\Lantai;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KamarController extends Controller
{
    public function storeLantai(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'gedung.manage');

        $validated = $request->validate([
            'gedung_id' => 'required|uuid|exists:gedung,id',
            'nomor_lantai' => 'required|integer|min:0',
            'nama_lantai' => 'required|string|max:100',
        ]);

        return response()->json(Lantai::create($validated), 201);
    }

    public function store(Request $request): JsonResponse
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

        return response()->json(Kamar::create([
            ...$validated,
            'status' => $validated['status'] ?? 'kosong',
            'tipe_kamar' => $validated['tipe_kamar'] ?? 'reguler',
        ]), 201);
    }

    public function update(Request $request, Kamar $kamar): JsonResponse
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

        return response()->json($kamar);
    }

    public function destroy(Request $request, Kamar $kamar): JsonResponse
    {
        $this->authorizePermission($request, 'gedung.manage');
        $kamar->delete();

        return response()->json(['ok' => true]);
    }
}
