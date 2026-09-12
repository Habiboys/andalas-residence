<?php

namespace App\Http\Controllers;

use App\Models\Periode;
use App\Services\MasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PeriodeController extends Controller
{
    public function options(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.view');

        return response()->json(MasterDataService::periodeList());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        $validated = $request->validate([
            'nama_periode' => 'required|string|max:150',
            'status' => 'required|in:aktif,nonaktif',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
        ]);

        return response()->json(MasterDataService::createPeriode($validated), 201);
    }

    public function update(Request $request, Periode $periode): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        $validated = $request->validate([
            'nama_periode' => 'sometimes|string|max:150',
            'status' => 'sometimes|in:aktif,nonaktif',
            'tanggal_mulai' => 'sometimes|date',
            'tanggal_selesai' => 'sometimes|date',
        ]);
        MasterDataService::updatePeriode($periode, $validated);

        return response()->json($periode);
    }

    public function destroy(Request $request, Periode $periode): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        MasterDataService::deletePeriode($periode);

        return response()->json(['ok' => true]);
    }
}
