<?php

namespace App\Http\Controllers;

use App\Models\Gedung;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GedungController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');

        $validated = $request->validate([
            'kode_gedung' => 'required|string|max:10|unique:gedung,kode_gedung',
            'nama_gedung' => 'required|string|max:150',
            'gender_peruntukan' => 'required|in:laki_laki,perempuan,campur',
            'alamat' => 'nullable|string',
            'deskripsi' => 'nullable|string',
            'foto' => [
                'nullable',
                Rule::when($request->hasFile('foto'), ['image', 'mimes:jpeg,jpg,png,webp', 'max:2048'], ['string']),
            ],
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
            'gender_peruntukan' => 'sometimes|in:laki_laki,perempuan,campur',
            'alamat' => 'nullable|string',
            'deskripsi' => 'nullable|string',
            'foto' => [
                'nullable',
                Rule::when($request->hasFile('foto'), ['image', 'mimes:jpeg,jpg,png,webp', 'max:2048'], ['string']),
            ],
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

        if ($gedung->lantai()->whereHas('kamar.penempatanKamar')->exists()) {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => "Gedung {$gedung->nama_gedung} tidak dapat dihapus karena ada kamar yang berisi penghuni.",
            ]);
        }

        $gedung->delete();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Gedung dihapus.',
        ]);
    }
}
