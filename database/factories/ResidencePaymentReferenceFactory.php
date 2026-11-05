<?php

namespace Database\Factories;

use App\Models\ResidencePaymentReference;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ResidencePaymentReference> */
class ResidencePaymentReferenceFactory extends Factory
{
    public function definition(): array
    {
        return ['reference' => fake()->unique()->uuid(), 'source' => 'Rekening koran DPUB', 'evidence_path' => 'documents/dpub/test.pdf', 'paid_at' => today(), 'amount' => 100000, 'payer_type' => 'personal', 'status' => 'unmatched', 'recorded_by' => User::factory()];
    }
}
