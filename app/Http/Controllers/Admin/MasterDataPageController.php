<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\RolePageController;
use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\JenisKegiatan;
use App\Models\User;
use App\Services\MasterDataService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MasterDataPageController extends Controller
{
    public function __invoke(Request $request, RolePageController $pages): Response
    {
        return Inertia::render('admin/master-data', [
            'initialUser' => $pages->userPayload($request),
            'role' => 'staff_admin',
            'page' => 'master-data',
            'jenis_kegiatan' => JenisKegiatan::orderBy('nama')->get(),
            'penugasan' => FasilitatorWilayah::with(['user', 'gedung'])->get(),
            'fasilitator' => User::whereHas('roles', fn (Builder $query) => $query->where('name', 'fasilitator')->where('guard_name', 'web'))->orderBy('nama')->get(['id', 'nama', 'email']),
            'gedung' => Gedung::orderBy('nama_gedung')->get(['id', 'nama_gedung']),
            'fakultas' => MasterDataService::fakultasList(),
            'departemen' => MasterDataService::departemenList(),
            'prodi' => MasterDataService::allProdiList(),
            'periode' => MasterDataService::periodeList(),
            'provinsi' => MasterDataService::provinsiList(),
            'kota' => MasterDataService::kotaList(),
            'kategori_transaksi' => MasterDataService::kategoriList(),
        ]);
    }
}
