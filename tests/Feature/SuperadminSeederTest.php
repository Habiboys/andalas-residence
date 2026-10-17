<?php

use App\Models\User;
use Database\Seeders\SuperadminSeeder;

it('restores the original superadmin login without creating fake students', function () {
    $this->seed(SuperadminSeeder::class);
    $user = User::sole();
    expect($user->hasRole('superadmin'))->toBeTrue();
    $this->post(route('login.store'), ['email' => 'superadmin@example.test', 'password' => 'password'])
        ->assertSessionHasNoErrors()->assertRedirect('/dashboard/redirect');
    $this->assertAuthenticatedAs($user);
    $this->assertDatabaseCount('mahasiswa_profil', 0);
});

it('does not reset an existing admin password or disabled status', function () {
    $user = User::factory()->create(['email' => 'superadmin@example.test', 'password' => 'changed-password', 'status' => 'nonaktif']);
    $password = $user->password;
    $this->seed(SuperadminSeeder::class);
    expect($user->fresh()->password)->toBe($password);
    expect($user->fresh()->status)->toBe('nonaktif');
    $this->assertDatabaseCount('users', 1);
});
