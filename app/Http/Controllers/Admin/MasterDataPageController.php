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
    public function __invoke(Request $request, RolePageController $pages, string $section = 'jenis-kegiatan'): Response
    {
        return Inertia::render('admin/master-data', [
            'initialUser' => $pages->userPayload($request),
            'role' => $request->user()->hasRole('superadmin') ? 'superadmin' : 'staff_admin',
            'page' => 'master-data/'.$section,
            'section' => $section,
            'jenis_kegiatan' => JenisKegiatan::orderBy('nama')->get(),
            'penugasan' => FasilitatorWilayah::with(['user.roles', 'gedung'])
                ->get()
                ->map(fn (FasilitatorWilayah $row): array => [
                    'id' => $row->id,
                    'user_id' => $row->user_id,
                    'gedung_id' => $row->gedung_id,
                    'user' => [
                        'id' => $row->user->id,
                        'nama' => $row->user->nama,
                        'email' => $row->user->email,
                        'role' => $row->user->getRoleNames()->first() ?? 'fasilitator',
                    ],
                    'gedung' => [
                        'id' => $row->gedung->id,
                        'nama_gedung' => $row->gedung->nama_gedung,
                    ],
                ])
                ->values(),
            'fasilitator' => User::with('roles:id,name')
                ->whereHas('roles', fn (Builder $query) => $query->whereIn('name', ['fasilitator', 'go'])->where('guard_name', 'web'))
                ->orderBy('nama')
                ->get(['id', 'nama', 'email'])
                ->map(fn (User $u): array => [
                    'id' => $u->id,
                    'nama' => $u->nama,
                    'email' => $u->email,
                    'role' => $u->getRoleNames()->first() ?? 'fasilitator',
                ])
                ->values(),
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
