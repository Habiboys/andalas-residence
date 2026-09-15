<?php

namespace App\Http\Controllers;

use App\Http\Requests\MasterDataRequest;
use App\Models\Periode;
use App\Services\MasterDataService;
use Illuminate\Http\RedirectResponse;

class PeriodeController extends Controller
{
    public function store(MasterDataRequest $request): RedirectResponse
    {
        $periode = MasterDataService::createPeriode($request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => "Periode {$periode->nama_periode} berhasil ditambahkan."]);
    }

    public function update(MasterDataRequest $request, Periode $periode): RedirectResponse
    {
        MasterDataService::updatePeriode($periode, $request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => "Periode {$periode->nama_periode} diperbarui."]);
    }

    public function destroy(MasterDataRequest $request, Periode $periode): RedirectResponse
    {
        MasterDataService::deletePeriode($periode);

        return back()->with('toast', ['type' => 'success', 'message' => 'Periode dihapus.']);
    }
}
