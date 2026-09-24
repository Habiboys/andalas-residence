<?php

use App\Enums\ClientProfileCategory;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

it('offers public client registration', function () {
    $this->get(route('register'))->assertOk()->assertInertia(fn (Assert $page) => $page->component('auth/register')->has('prodi'));
});

it('creates the selected client category without requiring an active residence period', function (string $category) {
    $this->seed(RolePermissionSeeder::class);
    $faculty = \App\Models\Faculty::create(['name' => 'Teknologi Informasi']);
    $department = \App\Models\Departemen::create(['name' => 'Informatika', 'faculty_id' => $faculty->id]);
    $program = \App\Models\Prodi::create(['name' => 'Informatika', 'jenjang' => 'S1', 'departemen_id' => $department->id]);
    $this->post(route('register.store'), [
        'nama' => 'Client Uji', 'nim_nip' => $category === 'non_student' ? 'PASPOR-UJI' : '2599000099', 'email' => 'client@example.test',
        'password' => 'password123', 'password_confirmation' => 'password123',
        'client_profile_category' => $category, 'angkatan' => 1999,
        'faculty_id' => $faculty->id, 'departemen_id' => $department->id, 'prodi_id' => $program->id,
        'gender' => 'perempuan',
        'role' => 'superadmin',
    ])->assertSessionHasNoErrors()->assertRedirect();

    $user = User::where('email', 'client@example.test')->sole();
    expect($user->client_profile_category)->toBe(ClientProfileCategory::from($category))
        ->and($user->hasRole('mahasiswa'))->toBeTrue()
        ->and($user->hasRole('superadmin'))->toBeFalse()
        ->and($user->mahasiswaProfil->status_huni)->toBe('calon')
        ->and($user->mahasiswaProfil->angkatan)->toBe($category === 'non_student' ? null : '2025');
    $this->assertAuthenticatedAs($user);
})->with(['local_kipk', 'local_non_kipk', 'international_student', 'international_free_facility', 'non_student']);

it('rejects unknown categories without creating an account', function () {
    $this->post(route('register.store'), [
        'nama' => 'Client Uji', 'nim_nip' => 'INVALID', 'email' => 'invalid@example.test',
        'password' => 'password123', 'password_confirmation' => 'password123',
        'client_profile_category' => 'superadmin', 'angkatan' => 'abcd', 'gender' => 'perempuan',
    ])->assertSessionHasErrors(['client_profile_category']);
    $this->assertDatabaseCount('users', 0);
});
