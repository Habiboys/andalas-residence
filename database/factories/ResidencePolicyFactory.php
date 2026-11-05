<?php

namespace Database\Factories;

use App\Models\ResidencePolicy;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ResidencePolicy> */
class ResidencePolicyFactory extends Factory
{
    public function definition(): array
    {
        return ['category' => 'local_non_kipk', 'version' => 1, 'settings' => ['open' => false, 'documents' => ['perjanjian'], 'building_ids' => [], 'rates' => [], 'month_days' => 30, 'day_basis' => 'nights', 'monthly_allowed' => false]];
    }
}
