<?php

namespace Database\Seeders;

use App\Models\Gedung;
use App\Services\ResidenceMasterImport;
use App\Services\RoomEligibility;
use Illuminate\Database\Seeder;

class ResidenceBuildingSeeder extends Seeder
{
    public function run(): void
    {
        $data = app(ResidenceMasterImport::class)->read(base_path('Data Asrama.xlsx'));
        foreach ($data['buildings'] as $building) {
            $model = Gedung::firstOrCreate(['kode_gedung' => $building['kode_gedung']], [
                'nama_gedung' => $building['nama_gedung'],
                'allowed_categories' => $building['allowed_categories'],
                'room_types' => $building['room_types'],
                'alamat' => 'Kampus Limau Manis',
            ]);
            $model->update(['gender_peruntukan' => RoomEligibility::buildingGender($model)]);
        }
        $this->call(ResidencePhotoSeeder::class);
    }
}
