<?php

namespace App\Http\Controllers;

use App\Models\Gedung;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class GedungController extends Controller
{
    public function store(Request $request): RedirectResponse
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

        $gedung = Gedung::create($validated);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Gedung {$gedung->nama_gedung} berhasil ditambahkan.",
        ]);
    }

    public function update(Request $request, Gedung $gedung): RedirectResponse
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

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Gedung {$gedung->nama_gedung} diperbarui.",
        ]);
    }

    public function destroy(Request $request, Gedung $gedung): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');
        $gedung->delete();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Gedung dihapus.',
        ]);
    }
}
