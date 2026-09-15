<?php

namespace App\Http\Controllers;

use App\Http\Requests\MasterDataRequest;
use App\Models\Province;
use App\Services\MasterDataService;
use Illuminate\Http\RedirectResponse;

class ProvinsiController extends Controller
{
    public function store(MasterDataRequest $request): RedirectResponse
    {
        $province = MasterDataService::createProvinsi($request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => "Provinsi {$province->name} berhasil ditambahkan."]);
    }

    public function update(MasterDataRequest $request, Province $province): RedirectResponse
    {
        MasterDataService::updateProvinsi($province, $request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => "Provinsi {$province->name} diperbarui."]);
    }

    public function destroy(MasterDataRequest $request, Province $province): RedirectResponse
    {
        MasterDataService::deleteProvinsi($province);

        return back()->with('toast', ['type' => 'success', 'message' => 'Provinsi dihapus.']);
    }
}
