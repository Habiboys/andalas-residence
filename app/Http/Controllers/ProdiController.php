<?php

namespace App\Http\Controllers;

use App\Http\Requests\MasterDataRequest;
use App\Models\Prodi;
use App\Services\MasterDataService;
use Illuminate\Http\RedirectResponse;

class ProdiController extends Controller
{
    public function store(MasterDataRequest $request): RedirectResponse
    {
        $prodi = MasterDataService::createProdi($request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => "Prodi {$prodi->name} berhasil ditambahkan."]);
    }

    public function update(MasterDataRequest $request, Prodi $prodi): RedirectResponse
    {
        MasterDataService::updateProdi($prodi, $request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => "Prodi {$prodi->name} diperbarui."]);
    }

    public function destroy(MasterDataRequest $request, Prodi $prodi): RedirectResponse
    {
        MasterDataService::deleteProdi($prodi);

        return back()->with('toast', ['type' => 'success', 'message' => 'Prodi dihapus.']);
    }
}
