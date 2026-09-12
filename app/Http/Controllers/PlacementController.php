<?php

namespace App\Http\Controllers;

use App\Models\Kamar;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Services\AuditLogService;
use App\Services\AutoPlacementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlacementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'penempatan.view');

        return response()->json(PenempatanKamar::with(['mahasiswa.user', 'kamar.lantai.gedung'])->latest()->get());
    }

    public function autoPreview(Request $request, AutoPlacementService $service): JsonResponse
    {
        $this->authorizePermission($request, 'penempatan.manage');

        return response()->json($service->runBatch($request->user(), false));
    }

    public function autoCommit(Request $request, AutoPlacementService $service): JsonResponse
    {
        $this->authorizePermission($request, 'penempatan.manage');

        return response()->json($service->runBatch($request->user(), true));
    }

    public function manual(Request $request): JsonResponse
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

        return response()->json($penempatan->load(['mahasiswa.user', 'kamar']), 201);
    }
}
