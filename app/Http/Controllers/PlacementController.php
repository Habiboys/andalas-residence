<?php

namespace App\Http\Controllers;

use App\Models\Kamar;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Services\AuditLogService;
use App\Services\AutoPlacementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlacementController extends Controller
{
    public function autoPreview(Request $request, AutoPlacementService $service): RedirectResponse
    {
        $this->authorizePermission($request, 'penempatan.manage');

        $preview = $service->runBatch($request->user(), false);

        return redirect()->back()->with('auto_preview', $preview)->with('toast', [
            'type' => 'success',
            'message' => 'Pratinjau penempatan otomatis disiapkan.',
        ]);
    }

    public function autoCommit(Request $request, AutoPlacementService $service): RedirectResponse
    {
        $this->authorizePermission($request, 'penempatan.manage');

        $result = $service->runBatch($request->user(), true);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Penempatan otomatis berhasil dikomit '.($result['assigned'] ?? 0).' mahasiswa.',
        ]);
    }

    public function manual(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'penempatan.manage');

        $validated = $request->validate([
            'mahasiswa_id' => 'required|uuid|exists:mahasiswa_profil,id',
            'kamar_id' => 'required|uuid|exists:kamar,id',
        ]);

        $mhs = MahasiswaProfil::findOrFail($validated['mahasiswa_id']);
        $kamar = Kamar::findOrFail($validated['kamar_id']);

        $okupansi = $kamar->penempatanKamar()->where('status', 'aktif')->count();
        abort_if($okupansi >= $kamar->kapasitas, 422, 'Kamar sudah penuh');

        $penempatan = DB::transaction(function () use ($mhs, $kamar, $request, $okupansi) {
            $penempatan = PenempatanKamar::create([
                'mahasiswa_id' => $mhs->id,
                'kamar_id' => $kamar->id,
                'periode_id' => $mhs->periode_id,
                'tanggal_mulai' => now()->toDateString(),
                'metode' => 'manual_override',
                'status' => 'aktif',
                'diproses_oleh' => $request->user()->id,
            ]);

            $newOkupansi = $okupansi + 1;
            $kamar->update([
                'status' => $newOkupansi >= $kamar->kapasitas ? 'penuh' : 'terisi_sebagian',
            ]);
            $mhs->update(['status_huni' => 'aktif', 'tanggal_masuk' => now()]);

            AuditLogService::log($request->user(), 'manual_placement', $penempatan, null, $penempatan->toArray(), $request);

            return $penempatan;
        });

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Mahasiswa ditempatkan di kamar {$kamar->nomor_kamar}.",
        ]);
    }
}
