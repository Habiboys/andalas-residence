<?php

namespace Database\Seeders;

use App\Models\Gedung;
use Illuminate\Database\Seeder;

class ResidenceBuildingSeeder extends Seeder
{
    public function run(): void
    {
        $buildings = [
            ['kode_gedung' => 'A', 'nama_gedung' => 'RPX (A)'],
            ['kode_gedung' => 'B', 'nama_gedung' => 'Rusunawa (B)'],
            ['kode_gedung' => 'C', 'nama_gedung' => 'Pupera Puteri (C)'],
            ['kode_gedung' => 'D', 'nama_gedung' => 'Menpera (D)'],
            ['kode_gedung' => 'E', 'nama_gedung' => 'RMS (E)'],
            ['kode_gedung' => 'F', 'nama_gedung' => 'Oren (F)'],
            ['kode_gedung' => 'G', 'nama_gedung' => 'Hijau (G)'],
            ['kode_gedung' => 'H', 'nama_gedung' => 'Pupera Putera (H)'],
            ['kode_gedung' => 'ASN', 'nama_gedung' => 'ASN'],
            ['kode_gedung' => 'Nakes', 'nama_gedung' => 'Nakes'],
        ];

        foreach ($buildings as $building) {
            Gedung::firstOrCreate(
                ['kode_gedung' => $building['kode_gedung']],
                [
                    'nama_gedung' => $building['nama_gedung'],
                    'gender_peruntukan' => 'campur',
                    'alamat' => 'Kampus Limau Manis',
                ]
            );
        }
    }
}
