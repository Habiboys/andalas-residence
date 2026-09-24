<?php

namespace Database\Seeders;

use App\Models\Gedung;
use Illuminate\Database\Seeder;

class ResidenceBuildingSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Nakes', 'ASN'] as $code) {
            Gedung::firstOrCreate(['kode_gedung' => $code], [
                'nama_gedung' => 'Asrama '.$code,
                'gender_peruntukan' => 'campur',
                'alamat' => 'Kampus Limau Manis',
            ]);
        }
    }
}
