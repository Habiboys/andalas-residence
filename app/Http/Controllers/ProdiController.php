<?php

namespace App\Http\Controllers;

use App\Models\Prodi;
use App\Services\MasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProdiController extends Controller
{
    public function options(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.view');

        return response()->json(MasterDataService::prodiList());
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.view');

        return response()->json(MasterDataService::allProdiList());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        $validated = $request->validate([
            'departemen_id' => 'required|uuid|exists:departemen,id',
            'name' => 'required|string|max:150',
            'jenjang' => 'required|in:D3,D4,S1,S2,S3',
        ]);

        return response()->json(MasterDataService::createProdi($validated), 201);
    }

    public function update(Request $request, Prodi $prodi): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        $validated = $request->validate([
            'departemen_id' => 'sometimes|uuid|exists:departemen,id',
            'name' => 'sometimes|string|max:150',
            'jenjang' => 'sometimes|in:D3,D4,S1,S2,S3',
        ]);

        return response()->json(MasterDataService::updateProdi($prodi, $validated));
    }

    public function destroy(Request $request, Prodi $prodi): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        MasterDataService::deleteProdi($prodi);

        return response()->json(['ok' => true]);
    }
}
