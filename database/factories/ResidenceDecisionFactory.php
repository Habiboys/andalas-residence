<?php

namespace Database\Factories;

use App\Models\ResidenceDecision;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ResidenceDecision> */
class ResidenceDecisionFactory extends Factory
{
    public function definition(): array
    {
        return ['kind' => 'defer', 'status' => 'pending', 'reason' => 'Permohonan penundaan', 'requested_by' => User::factory()];
    }
}
