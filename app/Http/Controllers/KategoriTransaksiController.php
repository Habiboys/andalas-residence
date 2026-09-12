<?php

namespace App\Http\Controllers;

use App\Models\KategoriTransaksi;
use App\Services\MasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KategoriTransaksiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.view');

        return response()->json(KategoriTransaksi::all());
    }

    public function masterList(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.view');

        return response()->json(MasterDataService::kategoriList());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        $validated = $request->validate([
            'nama_kategori' => 'required|string|max:150',
            'tipe' => 'required|in:pemasukan,pengeluaran',
            'kode_rekening' => 'nullable|string|max:50',
        ]);

        return response()->json(MasterDataService::createKategori($validated), 201);
    }

    public function update(Request $request, KategoriTransaksi $kategori): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        $validated = $request->validate([
            'nama_kategori' => 'sometimes|string|max:150',
            'tipe' => 'sometimes|in:pemasukan,pengeluaran',
            'kode_rekening' => 'nullable|string|max:50',
        ]);
        MasterDataService::updateKategori($kategori, $validated);

        return response()->json($kategori);
    }

    public function destroy(Request $request, KategoriTransaksi $kategori): JsonResponse
    {
        $this->authorizePermission($request, 'master.manage');
        MasterDataService::deleteKategori($kategori);

        return response()->json(['ok' => true]);
    }
}
