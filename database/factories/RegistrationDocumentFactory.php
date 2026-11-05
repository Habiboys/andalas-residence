<?php

namespace Database\Factories;

use App\Models\RegistrationDocument;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<RegistrationDocument> */
class RegistrationDocumentFactory extends Factory
{
    public function definition(): array
    {
        return ['kind' => 'perjanjian', 'version' => 1, 'status' => 'uploaded', 'path' => 'documents/test.pdf', 'checksum' => hash('sha256', 'test'), 'uploaded_by' => User::factory()];
    }
}
