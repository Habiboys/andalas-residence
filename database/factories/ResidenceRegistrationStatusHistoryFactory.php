<?php

namespace Database\Factories;

use App\Enums\ResidenceRegistrationStatus;
use App\Models\ResidenceRegistration;
use App\Models\ResidenceRegistrationStatusHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ResidenceRegistrationStatusHistory> */
class ResidenceRegistrationStatusHistoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'residence_registration_id' => ResidenceRegistration::factory(),
            'from_status' => ResidenceRegistrationStatus::Draft,
            'to_status' => ResidenceRegistrationStatus::Submitted,
            'changed_by' => null,
            'notes' => null,
        ];
    }
}
