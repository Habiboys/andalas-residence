<?php

namespace App\Services;

use App\Models\City;
use App\Models\Province;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class WilayahSyncService
{
    /** @return array{provinces: int, cities: int} */
    public function sync(): array
    {
        $provinces = $this->fetch('provinces.json', '/^\d{2}$/');
        $cities = [];
        foreach ($provinces as $province) {
            $cities[$province['code']] = $this->fetch('regencies/'.$province['code'].'.json', '/^'.preg_quote($province['code'], '/').'\.\d{2}$/');
        }

        return DB::transaction(function () use ($provinces, $cities): array {
            $existingProvinces = Province::all();
            $existingCities = City::all();
            $cityCount = 0;
            foreach ($provinces as $entry) {
                $province = $existingProvinces->firstWhere('wilayah_code', $entry['code'])
                    ?? $existingProvinces->first(fn (Province $row) => $row->wilayah_code === null && $this->normalized($row->name) === $this->normalized($entry['name']))
                    ?? new Province;
                $province->fill(['name' => $entry['name'], 'wilayah_code' => $entry['code']])->save();
                foreach ($cities[$entry['code']] as $cityEntry) {
                    $city = $existingCities->firstWhere('wilayah_code', $cityEntry['code'])
                        ?? $existingCities->first(fn (City $row) => $row->province_id === $province->id && $row->wilayah_code === null && $this->normalized($row->name) === $this->normalized($cityEntry['name']))
                        ?? new City;
                    $city->fill(['name' => $cityEntry['name'], 'province_id' => $province->id, 'wilayah_code' => $cityEntry['code']])->save();
                    $cityCount++;
                }
            }

            return ['provinces' => count($provinces), 'cities' => $cityCount];
        });
    }

    /** @return list<array{code: string, name: string}> */
    private function fetch(string $path, string $codePattern): array
    {
        $data = Http::acceptJson()->connectTimeout(5)->timeout(15)->retry(2, 200)
            ->get('https://wilayah.id/api/'.$path)->throw()->json('data');
        if (! is_array($data) || ! array_is_list($data) || $data === []) {
            throw ValidationException::withMessages(['wilayah' => 'Data wilayah.id kosong atau tidak valid. Data lama tetap dipertahankan.']);
        }
        $codes = [];
        foreach ($data as $row) {
            if (! is_array($row) || ! is_string($row['code'] ?? null) || ! preg_match($codePattern, $row['code']) || ! is_string($row['name'] ?? null) || trim($row['name']) === '' || isset($codes[$row['code']])) {
                throw ValidationException::withMessages(['wilayah' => 'Format data wilayah.id tidak valid. Data lama tetap dipertahankan.']);
            }
            $codes[$row['code']] = true;
        }

        return $data;
    }

    private function normalized(string $name): string
    {
        return Str::lower(Str::squish($name));
    }
}
