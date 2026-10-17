<?php

namespace Database\Factories;

use App\Models\ResidenceRegistration;
use App\Models\RoomInvitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RoomInvitation>
 */
class RoomInvitationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $host = ResidenceRegistration::query()->inRandomOrder()->first();

        return [
            'residence_registration_id' => $host?->id,
            'sender_id' => $host?->studentProfile?->user_id,
            'invitee_id' => User::factory()->student(),
            'kamar_id' => $host?->reserved_room_id,
            'status' => 'pending',
            'expires_at' => now()->addDay(),
        ];
    }
}
