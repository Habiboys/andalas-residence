<?php

namespace App\Http\Controllers;

use App\Models\Faculty;
use App\Services\MasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FakultasController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.view');

        return response()->json(MasterDataService::fakultasList());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        $validated = $request->validate(['name' => 'required|string|max:150|unique:faculty,name']);

        return response()->json(MasterDataService::createFakultas($validated), 201);
    }

    public function update(Request $request, Faculty $faculty): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        $validated = $request->validate(['name' => 'sometimes|string|max:150|unique:faculty,name,'.$faculty->id]);
        MasterDataService::updateFakultas($faculty, $validated);

        return response()->json($faculty);
    }

    public function destroy(Request $request, Faculty $faculty): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        MasterDataService::deleteFakultas($faculty);

        return response()->json(['ok' => true]);
    }
}
