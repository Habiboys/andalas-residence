<?php

namespace Database\Seeders;

use App\Models\Gedung;
use App\Models\ResidencePolicy;
use App\Services\ResidencePolicyService;
use Illuminate\Database\Seeder;

class ResidencePolicySeeder extends Seeder
{
    public function run(): void
    {
        $defaults = ['local_kipk' => ['A', 'D', 'G'], 'local_non_kipk' => ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            'international' => ['B', 'F', 'H'], 'summer_course' => ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Nakes'], 'non_student' => ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Nakes']];
        foreach (ResidencePolicyService::CATEGORIES as $category) {
            ResidencePolicy::firstOrCreate(['category' => $category, 'version' => 1], ['settings' => [
                'open' => false, 'documents' => ['perjanjian'], 'building_ids' => Gedung::whereIn('kode_gedung', $defaults[$category])->orderBy('kode_gedung')->pluck('id')->all(),
                'rates' => [], 'month_days' => 30, 'day_basis' => 'nights', 'monthly_allowed' => false,
            ]]);
        }
    }
}
