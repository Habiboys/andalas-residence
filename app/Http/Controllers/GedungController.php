<?php

namespace App\Http\Controllers;

use App\Models\Gedung;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GedungController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'gedung.view');

        return response()->json(Gedung::with(['lantai.kamar.penempatanKamar.mahasiswa.user'])->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'gedung.manage');

        $validated = $request->validate([
            'kode_gedung' => 'required|string|max:10|unique:gedung,kode_gedung',
            'nama_gedung' => 'required|string|max:150',
            'gender_peruntukan' => 'required|in:laki_laki,perempuan,campuran',
            'alamat' => 'nullable|string',
            'deskripsi' => 'nullable|string',
            'foto' => 'nullable|string',
        ]);

        if ($request->hasFile('foto')) {
            $validated['foto'] = $request->file('foto')->store('gedung', 'public');
        }

        return response()->json(Gedung::create($validated), 201);
    }

    public function update(Request $request, Gedung $gedung): JsonResponse
    {
        $this->authorizePermission($request, 'gedung.manage');

        $validated = $request->validate([
            'kode_gedung' => 'sometimes|string|max:10|unique:gedung,kode_gedung,'.$gedung->id,
            'nama_gedung' => 'sometimes|string|max:150',
            'gender_peruntukan' => 'sometimes|in:laki_laki,perempuan,campuran',
            'alamat' => 'nullable|string',
            'deskripsi' => 'nullable|string',
            'foto' => 'nullable|string',
        ]);

        if ($request->hasFile('foto')) {
            $validated['foto'] = $request->file('foto')->store('gedung', 'public');
        }

        $gedung->update($validated);

        return response()->json($gedung);
    }

    public function destroy(Request $request, Gedung $gedung): JsonResponse
    {
        $this->authorizePermission($request, 'gedung.manage');
        $gedung->delete();

        return response()->json(['ok' => true]);
    }
}
