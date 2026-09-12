<?php

namespace App\Http\Controllers;

use App\Models\City;
use App\Services\MasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KotaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.view');

        return response()->json(MasterDataService::kotaList());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        $validated = $request->validate([
            'province_id' => 'required|uuid|exists:provinces,id',
            'name' => 'required|string|max:150',
        ]);

        return response()->json(MasterDataService::createKota($validated), 201);
    }

    public function update(Request $request, City $city): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        $validated = $request->validate([
            'province_id' => 'sometimes|uuid|exists:provinces,id',
            'name' => 'sometimes|string|max:150',
        ]);

        return response()->json(MasterDataService::updateKota($city, $validated));
    }

    public function destroy(Request $request, City $city): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        MasterDataService::deleteKota($city);

        return response()->json(['ok' => true]);
    }
}
