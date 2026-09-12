<?php

namespace App\Http\Controllers;

use App\Models\Departemen;
use App\Services\MasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartemenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.view');

        return response()->json(MasterDataService::departemenList());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        $validated = $request->validate([
            'faculty_id' => 'required|uuid|exists:faculty,id',
            'name' => 'required|string|max:150',
        ]);

        return response()->json(MasterDataService::createDepartemen($validated), 201);
    }

    public function update(Request $request, Departemen $departemen): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        $validated = $request->validate([
            'faculty_id' => 'sometimes|uuid|exists:faculty,id',
            'name' => 'sometimes|string|max:150',
        ]);

        return response()->json(MasterDataService::updateDepartemen($departemen, $validated));
    }

    public function destroy(Request $request, Departemen $departemen): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        MasterDataService::deleteDepartemen($departemen);

        return response()->json(['ok' => true]);
    }
}
