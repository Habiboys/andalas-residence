<?php

namespace App\Http\Controllers;

use App\Http\Requests\MasterDataRequest;
use App\Models\Faculty;
use App\Services\MasterDataService;
use Illuminate\Http\RedirectResponse;

class FakultasController extends Controller
{
    public function store(MasterDataRequest $request): RedirectResponse
    {
        $faculty = MasterDataService::createFakultas($request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => "Fakultas {$faculty->name} berhasil ditambahkan."]);
    }

    public function update(MasterDataRequest $request, Faculty $faculty): RedirectResponse
    {
        MasterDataService::updateFakultas($faculty, $request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => "Fakultas {$faculty->name} diperbarui."]);
    }

    public function destroy(MasterDataRequest $request, Faculty $faculty): RedirectResponse
    {
        MasterDataService::deleteFakultas($faculty);

        return back()->with('toast', ['type' => 'success', 'message' => 'Fakultas dihapus.']);
    }
}
