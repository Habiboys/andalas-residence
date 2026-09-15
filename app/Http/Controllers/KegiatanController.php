<?php

namespace App\Http\Controllers;

use App\Models\Kegiatan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class KegiatanController extends Controller
{
    public function store(Request $request): RedirectResponse
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

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Kegiatan {$kegiatan->judul} berhasil dibuat.",
        ]);
    }

    public function update(Request $request, Kegiatan $kegiatan): RedirectResponse
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

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Kegiatan {$kegiatan->judul} diperbarui.",
        ]);
    }

    public function destroy(Request $request, Kegiatan $kegiatan): RedirectResponse
    {
        $this->authorizePermission($request, 'kegiatan.manage');
        $kegiatan->delete();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Kegiatan dihapus.',
        ]);
    }
}
