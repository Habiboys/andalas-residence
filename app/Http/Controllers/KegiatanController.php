<?php

namespace App\Http\Controllers;

use App\Models\Kegiatan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KegiatanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'kegiatan.view');

        return response()->json(Kegiatan::with('partisipan')->latest('tanggal_mulai')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'kegiatan.manage');

        $validated = $request->validate([
            'judul' => 'required|string|max:200',
            'deskripsi' => 'nullable|string',
            'lokasi' => 'nullable|string|max:200',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'nullable|date|after_or_equal:tanggal_mulai',
            'target_role' => 'nullable|array',
        ]);

        $kegiatan = Kegiatan::create([
            ...$validated,
            'dibuat_oleh' => $request->user()->id,
        ]);

        return response()->json($kegiatan, 201);
    }

    public function update(Request $request, Kegiatan $kegiatan): JsonResponse
    {
        $this->authorizePermission($request, 'kegiatan.manage');

        $validated = $request->validate([
            'judul' => 'sometimes|string|max:200',
            'deskripsi' => 'nullable|string',
            'lokasi' => 'nullable|string|max:200',
            'tanggal_mulai' => 'sometimes|date',
            'tanggal_selesai' => 'nullable|date',
            'target_role' => 'nullable|array',
        ]);

        $kegiatan->update($validated);

        return response()->json($kegiatan);
    }

    public function destroy(Request $request, Kegiatan $kegiatan): JsonResponse
    {
        $this->authorizePermission($request, 'kegiatan.manage');
        $kegiatan->delete();

        return response()->json(['ok' => true]);
    }
}
