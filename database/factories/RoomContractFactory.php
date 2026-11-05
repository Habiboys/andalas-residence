<?php

namespace Database\Factories;

use App\Models\RoomContract;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<RoomContract> */
class RoomContractFactory extends Factory
{
    public function definition(): array
    {
        return ['occupants' => 2, 'total' => 10000000, 'members' => [], 'approved_by' => User::factory(), 'approved_at' => now()];
    }
}
