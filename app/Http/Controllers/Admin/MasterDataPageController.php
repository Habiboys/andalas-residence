<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\RolePageController;
use App\Services\MasterDataService;
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
