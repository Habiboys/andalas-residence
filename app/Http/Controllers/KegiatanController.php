<?php

namespace App\Http\Controllers;

use App\Models\Kegiatan;
use App\Services\ResidenceBuildingAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'gedung_id' => 'nullable|uuid|exists:gedung,id',
        ]);

        $this->authorizeBuilding($request, $validated['gedung_id'] ?? null);

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

        abort_if($request->user()->hasRole('fasilitator') && $kegiatan->dibuat_oleh !== $request->user()->id, 403);
        $this->authorizeBuilding($request, $kegiatan->gedung_id);

        $validated = $request->validate([
            'judul' => 'sometimes|string|max:200',
            'deskripsi' => 'nullable|string',
            'lokasi' => 'nullable|string|max:200',
            'tanggal_mulai' => 'sometimes|date',
            'tanggal_selesai' => 'required|date|after_or_equal:'.($request->input('tanggal_mulai') ?? $kegiatan->tanggal_mulai->toDateTimeString()),
            'gedung_id' => 'sometimes|nullable|uuid|exists:gedung,id',
        ]);

        if (array_key_exists('gedung_id', $validated)) {
            $this->authorizeBuilding($request, $validated['gedung_id']);
            if ($validated['gedung_id'] !== $kegiatan->gedung_id && $kegiatan->attendanceSessions()->exists()) {
                throw ValidationException::withMessages(['gedung_id' => 'Cakupan kegiatan yang sudah memiliki sesi absensi tidak dapat diubah. Buat kegiatan baru.']);
            }
        }

        $kegiatan->update($validated);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Kegiatan {$kegiatan->judul} diperbarui.",
        ]);
    }

    public function destroy(Request $request, Kegiatan $kegiatan): RedirectResponse
    {
        $this->authorizePermission($request, 'kegiatan.manage');
        abort_if($request->user()->hasRole('fasilitator') && $kegiatan->dibuat_oleh !== $request->user()->id, 403);
        $this->authorizeBuilding($request, $kegiatan->gedung_id);
        if ($kegiatan->attendanceSessions()->exists()) {
            throw ValidationException::withMessages(['kegiatan' => 'Kegiatan dengan sesi absensi tidak dapat dihapus karena memiliki riwayat.']);
        }
        $kegiatan->delete();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Kegiatan dihapus.',
        ]);
    }

    private function authorizeBuilding(Request $request, ?string $buildingId): void
    {
        abort_if($request->user()->hasRole('fasilitator') && $buildingId !== null
            && ! ResidenceBuildingAccess::allows($request->user(), $buildingId), 403);
    }
}
