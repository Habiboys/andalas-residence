<?php

namespace App\Http\Controllers;

use App\Http\Requests\MasterDataRequest;
use App\Models\City;
use App\Services\MasterDataService;
use Illuminate\Http\RedirectResponse;

class KotaController extends Controller
{
    public function store(MasterDataRequest $request): RedirectResponse
    {
        $city = MasterDataService::createKota($request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => "Kota {$city->name} berhasil ditambahkan."]);
    }

    public function update(MasterDataRequest $request, City $city): RedirectResponse
    {
        MasterDataService::updateKota($city, $request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => "Kota {$city->name} diperbarui."]);
    }

    public function destroy(MasterDataRequest $request, City $city): RedirectResponse
    {
        MasterDataService::deleteKota($city);

        return back()->with('toast', ['type' => 'success', 'message' => 'Kota dihapus.']);
    }
}
