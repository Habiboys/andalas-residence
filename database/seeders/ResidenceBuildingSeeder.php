<?php

namespace Database\Seeders;

use App\Models\Gedung;
use App\Services\ResidenceMasterImport;
use Illuminate\Database\Seeder;

class ResidenceBuildingSeeder extends Seeder
{
    public function run(): void
    {
        $data = app(ResidenceMasterImport::class)->read(base_path('Data Asrama.xlsx'));
        foreach ($data['buildings'] as $building) {
            Gedung::updateOrCreate(['kode_gedung' => $building['kode_gedung']], [
                'nama_gedung' => $building['nama_gedung'],
                'allowed_categories' => $building['allowed_categories'],
                'alamat' => 'Kampus Limau Manis',
            ]);
        }
    }
}
