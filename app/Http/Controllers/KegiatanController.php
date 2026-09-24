<?php

namespace App\Http\Controllers;

use App\Actions\Attendance\OpenAttendanceSession;
use App\Models\JenisKegiatan;
use App\Models\Kegiatan;
use App\Services\ResidenceBuildingAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class KegiatanController extends Controller
{
    public function store(Request $request, OpenAttendanceSession $open): RedirectResponse
    {
        $this->authorizePermission($request, 'kegiatan.manage');
        $data = $request->validate([
            'jenis_kegiatan_id' => 'required|uuid|exists:jenis_kegiatan,id',
            'judul' => 'nullable|string|max:200',
            'deskripsi' => 'nullable|string|max:5000',
            'gedung_id' => 'nullable|uuid|exists:gedung,id',
            'duration_minutes' => 'required|integer|between:1,1440',
            'radius_meters' => 'required|integer|between:10,1000',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy_meters' => 'required|numeric|min:0|lte:radius_meters',
        ]);
        $buildingId = $data['gedung_id'] ?? null;
        if ($request->user()->hasRole('fasilitator')) {
            $assigned = ResidenceBuildingAccess::ids($request->user());
            if (count($assigned) !== 1) {
                throw ValidationException::withMessages(['gedung_id' => 'Admin harus menetapkan satu gedung penugasan Anda terlebih dahulu.']);
            }
            abort_if($buildingId !== null && $buildingId !== $assigned[0], 403);
            $buildingId = $assigned[0];
        }
        if (! $buildingId) {
            throw ValidationException::withMessages(['gedung_id' => 'Pilih gedung kegiatan.']);
        }
        $type = JenisKegiatan::findOrFail($data['jenis_kegiatan_id']);
        if ($type->is_other && blank($data['judul'] ?? null)) {
            throw ValidationException::withMessages(['judul' => 'Isi nama kegiatan untuk jenis Lainnya.']);
        }
        $session = DB::transaction(function () use ($request, $data, $type, $buildingId, $open) {
            $start = now();
            $activity = Kegiatan::create([
                'judul' => $type->is_other ? trim($data['judul']) : $type->nama,
                'deskripsi' => $data['deskripsi'] ?? null,
                'jenis_kegiatan_id' => $type->id, 'gedung_id' => $buildingId,
                'dibuat_oleh' => $request->user()->id,
                'tanggal_mulai' => $start,
                'tanggal_selesai' => $start->copy()->addMinutes((int) $data['duration_minutes']),
            ]);

            return $open->handle($activity, $request->user(), $activity->tanggal_selesai,
                (float) $data['latitude'], (float) $data['longitude'], (int) $data['radius_meters'], (int) $data['radius_meters'], (float) $data['accuracy_meters'])['session'];
        });

        return back()->with('activity_session_id', $session->id)->with('toast', ['type' => 'success', 'message' => 'Kegiatan dan QR berhasil dibuat.']);
    }

    public function update(Request $request, Kegiatan $kegiatan): RedirectResponse
    {
        $this->authorizePermission($request, 'kegiatan.manage');
        abort_if($request->user()->hasRole('fasilitator') && ! $kegiatan->allowsFacilitator($request->user()), 403);
        $data = $request->validate([
            'deskripsi' => 'nullable|string|max:5000',
            'judul' => 'prohibited', 'gedung_id' => 'prohibited',
            'tanggal_mulai' => 'prohibited', 'tanggal_selesai' => 'prohibited', 'lokasi' => 'prohibited',
        ]);
        $kegiatan->update($data);

        return back()->with('toast', ['type' => 'success', 'message' => 'Catatan kegiatan diperbarui.']);
    }

    public function destroy(Request $request, Kegiatan $kegiatan): RedirectResponse
    {
        $this->authorizePermission($request, 'kegiatan.manage');
        abort_if($request->user()->hasRole('fasilitator') && ! $kegiatan->allowsFacilitator($request->user()), 403);
        if ($kegiatan->attendanceSession()->exists()) {
            throw ValidationException::withMessages(['kegiatan' => 'Kegiatan dengan QR disimpan sebagai riwayat. Tutup sesi untuk mengakhirinya.']);
        }
        $kegiatan->delete();

        return back()->with('toast', ['type' => 'success', 'message' => 'Kegiatan lama tanpa QR dihapus.']);
    }
}
