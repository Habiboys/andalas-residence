<?php

namespace App\Services;

use App\Models\City;
use App\Models\Departemen;
use App\Models\Faculty;
use App\Models\KategoriTransaksi;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\Province;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class MasterDataService
{
    // ─── Prodi & Periode (read-only lists) ────────────────────────────────

    public static function prodiList(): Collection
    {
        return Prodi::orderBy('name')->get(['id', 'name', 'jenjang']);
    }

    public static function periodeList(): Collection
    {
        return Periode::orderByDesc('tanggal_mulai')->get();
    }

    // ─── Fakultas ─────────────────────────────────────────────────────────

    public static function fakultasList(): Collection
    {
        return Faculty::withCount('departemen')->orderBy('name')->get();
    }

    public static function createFakultas(array $data): Faculty
    {
        return Faculty::create($data);
    }

    public static function updateFakultas(Faculty $faculty, array $data): Faculty
    {
        $faculty->update($data);

        return $faculty;
    }

    public static function deleteFakultas(Faculty $faculty): void
    {
        abort_if($faculty->departemen()->exists(), 422, 'Fakultas masih memiliki departemen');
        $faculty->delete();
    }

    // ─── Departemen ───────────────────────────────────────────────────────

    public static function departemenList(): Collection
    {
        return Departemen::with('faculty:id,name')->withCount('prodi')->orderBy('name')->get();
    }

    public static function createDepartemen(array $data): Departemen
    {
        return Departemen::create($data);
    }

    public static function updateDepartemen(Departemen $departemen, array $data): Departemen
    {
        $departemen->update($data);

        return $departemen->fresh('faculty:id,name');
    }

    public static function deleteDepartemen(Departemen $departemen): void
    {
        abort_if($departemen->prodi()->exists(), 422, 'Departemen masih memiliki program studi');
        $departemen->delete();
    }

    // ─── Prodi ────────────────────────────────────────────────────────────

    public static function allProdiList(): Collection
    {
        return Prodi::with('departemen.faculty:id,name')
            ->orderBy('name')
            ->get(['id', 'departemen_id', 'name', 'jenjang']);
    }

    public static function createProdi(array $data): Prodi
    {
        return Prodi::create($data)->load('departemen.faculty:id,name');
    }

    public static function updateProdi(Prodi $prodi, array $data): Prodi
    {
        $prodi->update($data);

        return $prodi->fresh('departemen.faculty:id,name');
    }

    public static function deleteProdi(Prodi $prodi): void
    {
        abort_if($prodi->mahasiswaProfil()->exists(), 422, 'Program studi masih memiliki mahasiswa');
        $prodi->delete();
    }

    // ─── Periode ──────────────────────────────────────────────────────────

    public static function createPeriode(array $data): Periode
    {
        return DB::transaction(function () use ($data): Periode {
            Periode::query()->lockForUpdate()->get();
            if (($data['status'] ?? null) === 'aktif') {
                Periode::where('status', 'aktif')->update(['status' => 'nonaktif']);
            }

            return Periode::create($data);
        });
    }

    public static function updatePeriode(Periode $periode, array $data): Periode
    {
        return DB::transaction(function () use ($periode, $data): Periode {
            Periode::query()->lockForUpdate()->get();
            if (($data['status'] ?? null) === 'aktif') {
                Periode::where('id', '!=', $periode->id)->where('status', 'aktif')->update(['status' => 'nonaktif']);
            }
            $periode->update($data);

            return $periode;
        });
    }

    public static function deletePeriode(Periode $periode): void
    {
        abort_if($periode->mahasiswaProfil()->exists(), 422, 'Periode masih memiliki mahasiswa');
        $periode->delete();
    }

    // ─── Provinsi ─────────────────────────────────────────────────────────

    public static function provinsiList(): Collection
    {
        return Province::withCount('cities')->orderBy('name')->get();
    }

    public static function createProvinsi(array $data): Province
    {
        return Province::create($data);
    }

    public static function updateProvinsi(Province $province, array $data): Province
    {
        $province->update($data);

        return $province;
    }

    public static function deleteProvinsi(Province $province): void
    {
        abort_if($province->cities()->exists(), 422, 'Provinsi masih memiliki kota/kabupaten');
        $province->delete();
    }

    // ─── Kota ─────────────────────────────────────────────────────────────

    public static function kotaList(): Collection
    {
        return City::with('province:id,name')->orderBy('name')->get();
    }

    public static function createKota(array $data): City
    {
        return City::create($data)->load('province:id,name');
    }

    public static function updateKota(City $city, array $data): City
    {
        $city->update($data);

        return $city->fresh('province:id,name');
    }

    public static function deleteKota(City $city): void
    {
        $city->delete();
    }

    // ─── Kategori transaksi ───────────────────────────────────────────────

    public static function kategoriList(): Collection
    {
        return KategoriTransaksi::withCount('transaksi')->orderBy('nama_kategori')->get();
    }

    public static function createKategori(array $data): KategoriTransaksi
    {
        return KategoriTransaksi::create($data);
    }

    public static function updateKategori(KategoriTransaksi $kategori, array $data): KategoriTransaksi
    {
        $kategori->update($data);

        return $kategori;
    }

    public static function deleteKategori(KategoriTransaksi $kategori): void
    {
        abort_if($kategori->transaksi()->exists(), 422, 'Kategori masih digunakan oleh transaksi');
        $kategori->delete();
    }
}
