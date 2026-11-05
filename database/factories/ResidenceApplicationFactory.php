<?php

namespace Database\Factories;

use App\Models\ResidenceApplication;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ResidenceApplication> */
class ResidenceApplicationFactory extends Factory
{
    public function definition(): array
    {
        return ['number' => fake()->unique()->uuid(), 'kind' => 'summer_course', 'institution' => fake()->company(), 'recipient_email' => fake()->safeEmail(), 'letter_path' => 'documents/test.pdf', 'starts_at' => today(), 'ends_at' => today()->addDays(7), 'funding' => 'sponsor', 'created_by' => User::factory()];
    }
}
