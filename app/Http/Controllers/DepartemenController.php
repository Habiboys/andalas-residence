<?php

namespace App\Http\Controllers;

use App\Http\Requests\MasterDataRequest;
use App\Models\Departemen;
use App\Services\MasterDataService;
use Illuminate\Http\RedirectResponse;

class DepartemenController extends Controller
{
    public function store(MasterDataRequest $request): RedirectResponse
    {
        $departemen = MasterDataService::createDepartemen($request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => "Departemen {$departemen->name} berhasil ditambahkan."]);
    }

    public function update(MasterDataRequest $request, Departemen $departemen): RedirectResponse
    {
        MasterDataService::updateDepartemen($departemen, $request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => "Departemen {$departemen->name} diperbarui."]);
    }

    public function destroy(MasterDataRequest $request, Departemen $departemen): RedirectResponse
    {
        MasterDataService::deleteDepartemen($departemen);

        return back()->with('toast', ['type' => 'success', 'message' => 'Departemen dihapus.']);
    }
}
