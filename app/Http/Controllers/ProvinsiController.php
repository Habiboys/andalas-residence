<?php

namespace App\Http\Controllers;

use App\Models\Province;
use App\Services\MasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProvinsiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.view');

        return response()->json(MasterDataService::provinsiList());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        $validated = $request->validate(['name' => 'required|string|max:150|unique:provinces,name']);

        return response()->json(MasterDataService::createProvinsi($validated), 201);
    }

    public function update(Request $request, Province $province): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        $validated = $request->validate(['name' => 'sometimes|string|max:150|unique:provinces,name,'.$province->id]);
        MasterDataService::updateProvinsi($province, $validated);

        return response()->json($province);
    }

    public function destroy(Request $request, Province $province): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        MasterDataService::deleteProvinsi($province);

        return response()->json(['ok' => true]);
    }
}
