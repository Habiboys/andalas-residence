<?php

namespace Database\Seeders;

use App\Services\ResidenceMasterImport;
use Illuminate\Database\Seeder;

class ResidenceMasterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $import = app(ResidenceMasterImport::class);
        $data = $import->read(base_path('Data Asrama.xlsx'));
        $import->apply($data['buildings']);
        foreach ($data['warnings'] as $warning) {
            $this->command?->warn($warning);
        }
    }
}
