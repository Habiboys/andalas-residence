<?php

namespace Database\Factories;

use App\Enums\ClientProfileCategory;
use App\Enums\ParentStudentRelationship;
use App\Models\MahasiswaProfil;
use App\Models\ParentStudentLink;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ParentStudentLink> */
class ParentStudentLinkFactory extends Factory
{
    public function definition(): array
    {
        return [
            'parent_user_id' => User::factory()->state(['client_profile_category' => ClientProfileCategory::Parent]),
            'student_profile_id' => MahasiswaProfil::query()->inRandomOrder()->value('id'),
            'relationship' => fake()->randomElement(ParentStudentRelationship::cases()),
            'is_primary_contact' => false,
        ];
    }
}
