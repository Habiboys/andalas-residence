<?php

namespace App\Http\Controllers;

use App\Http\Requests\MasterDataRequest;
use App\Models\KategoriTransaksi;
use App\Services\MasterDataService;
use Illuminate\Http\RedirectResponse;

class KategoriTransaksiController extends Controller
{
    public function store(MasterDataRequest $request): RedirectResponse
    {
        $kategori = MasterDataService::createKategori($request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => "Kategori {$kategori->nama_kategori} berhasil ditambahkan."]);
    }

    public function update(MasterDataRequest $request, KategoriTransaksi $kategori): RedirectResponse
    {
        MasterDataService::updateKategori($kategori, $request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => "Kategori {$kategori->nama_kategori} diperbarui."]);
    }

    public function destroy(MasterDataRequest $request, KategoriTransaksi $kategori): RedirectResponse
    {
        MasterDataService::deleteKategori($kategori);

        return back()->with('toast', ['type' => 'success', 'message' => 'Kategori dihapus.']);
    }
}
