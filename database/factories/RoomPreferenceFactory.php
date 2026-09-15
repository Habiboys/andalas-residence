<?php

namespace Database\Factories;

use App\Models\ResidenceRegistration;
use App\Models\RoomPreference;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<RoomPreference> */
class RoomPreferenceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'residence_registration_id' => ResidenceRegistration::factory(),
            'kamar_id' => null,
            'priority' => 1,
            'room_type' => fake()->randomElement(['reguler', 'aksesibel']),
            'notes' => null,
        ];
    }
}
