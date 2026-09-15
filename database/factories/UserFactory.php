<?php

namespace Database\Factories;

use App\Enums\ClientProfileCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'nim_nip' => fake()->unique()->numerify('##########'),
            'nama' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'no_hp' => fake()->phoneNumber(),
            'gender' => fake()->randomElement(['laki_laki', 'perempuan']),
            'status' => 'aktif',
            'remember_token' => Str::random(10),
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function student(): static
    {
        return $this->state(fn (array $attributes) => [
            'client_profile_category' => ClientProfileCategory::Student,
        ]);
    }

    public function parent(): static
    {
        return $this->state(fn (array $attributes) => [
            'client_profile_category' => ClientProfileCategory::Parent,
        ]);
    }

    public function withTwoFactor(): static
    {
        return $this;
    }
}
