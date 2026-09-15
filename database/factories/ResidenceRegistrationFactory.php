<?php

namespace Database\Factories;

use App\Enums\ResidenceRegistrationStatus;
use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\ResidenceRegistration;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ResidenceRegistration> */
class ResidenceRegistrationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'student_profile_id' => MahasiswaProfil::query()->inRandomOrder()->value('id'),
            'periode_id' => Periode::query()->inRandomOrder()->value('id'),
            'status' => ResidenceRegistrationStatus::Draft,
            'submitted_at' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
            'notes' => null,
        ];
    }
}
