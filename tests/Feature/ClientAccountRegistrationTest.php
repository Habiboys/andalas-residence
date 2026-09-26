<?php

use App\Enums\ClientProfileCategory;
use App\Models\Departemen;
use App\Models\Faculty;
use App\Models\KipkRecipient;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

it('offers public client registration', function () {
    $this->get(route('register'))->assertOk()->assertInertia(fn (Assert $page) => $page->component('auth/register')->has('prodi'));
});

it('derives the client category without granting self declared sponsorship', function (string $category) {
    $this->seed(RolePermissionSeeder::class);
    $faculty = Faculty::create(['name' => 'Teknologi Informasi']);
    $department = Departemen::create(['name' => 'Informatika', 'faculty_id' => $faculty->id]);
    $program = Prodi::create(['name' => 'Informatika', 'jenjang' => 'S1', 'departemen_id' => $department->id]);
    if ($category === 'local_kipk') {
        Periode::create(['nama_periode' => '2025/2026', 'status' => 'aktif', 'angkatan_maba' => 2025, 'tanggal_mulai' => '2025-08-01', 'tanggal_selesai' => '2026-07-31']);
        KipkRecipient::create(['nim' => '2599000099', 'angkatan' => 2025, 'nama' => 'Client Uji']);
    }
    $this->post(route('register.store'), [
        'nama' => 'Client Uji', 'nim_nip' => $category === 'non_student' ? 'PASPOR-UJI' : '2599000099', 'email' => 'client@example.test',
        'password' => 'password123', 'password_confirmation' => 'password123',
        'client_profile_category' => $category, 'angkatan' => 1999,
        'faculty_id' => $faculty->id, 'departemen_id' => $department->id, 'prodi_id' => $program->id,
        'gender' => 'perempuan',
        'role' => 'superadmin',
    ])->assertSessionHasNoErrors()->assertRedirect();

    $user = User::where('email', 'client@example.test')->sole();
    expect($user->client_profile_category)->toBe(ClientProfileCategory::from(match ($category) {
        'international_free_facility' => 'international_student',
        'local_student' => 'local_non_kipk',
        default => $category,
    }))
        ->and($user->hasRole('mahasiswa'))->toBeTrue()
        ->and($user->hasRole('superadmin'))->toBeFalse()
        ->and($user->mahasiswaProfil->status_huni)->toBe('calon')
        ->and($user->mahasiswaProfil->angkatan)->toBe($category === 'non_student' ? null : '2025');
    $this->assertAuthenticatedAs($user);
})->with(['local_student', 'local_kipk', 'local_non_kipk', 'international_student', 'international_free_facility', 'non_student']);

it('uses the KIPK register for every local choice and excludes postgraduate students', function (string $choice, string $degree, bool $listed, string $expected) {
    $this->seed(RolePermissionSeeder::class);
    $faculty = Faculty::create(['name' => 'Fakultas Uji']);
    $department = Departemen::create(['name' => 'Departemen Uji', 'faculty_id' => $faculty->id]);
    $program = Prodi::create(['name' => 'Program Uji', 'jenjang' => $degree, 'departemen_id' => $department->id]);
    Periode::create(['nama_periode' => '2026/2027', 'status' => 'aktif', 'angkatan_maba' => 2026, 'tanggal_mulai' => '2026-08-01', 'tanggal_selesai' => '2027-07-31']);
    if ($listed) {
        KipkRecipient::create(['nim' => '2612345678', 'angkatan' => 2026, 'nama' => 'Uji']);
    }
    $this->post(route('register.store'), [
        'nama' => 'Uji', 'nim_nip' => '2612345678', 'email' => 'uji@example.test', 'password' => 'password123', 'password_confirmation' => 'password123',
        'client_profile_category' => $choice, 'gender' => 'perempuan', 'faculty_id' => $faculty->id, 'departemen_id' => $department->id, 'prodi_id' => $program->id,
    ])->assertSessionHasNoErrors();
    expect(User::where('email', 'uji@example.test')->sole()->client_profile_category->value)->toBe($expected);
})->with([
    ['local_student', 'S1', true, 'local_kipk'],
    ['local_non_kipk', 'S1', true, 'local_kipk'],
    ['local_kipk', 'S1', false, 'local_non_kipk'],
    ['local_student', 'S2', true, 'local_non_kipk'],
    ['local_student', 'S3', true, 'local_non_kipk'],
]);

it('rejects unknown categories without creating an account', function () {
    $this->post(route('register.store'), [
        'nama' => 'Client Uji', 'nim_nip' => 'INVALID', 'email' => 'invalid@example.test',
        'password' => 'password123', 'password_confirmation' => 'password123',
        'client_profile_category' => 'superadmin', 'angkatan' => 'abcd', 'gender' => 'perempuan',
    ])->assertSessionHasErrors(['client_profile_category']);
    $this->assertDatabaseCount('users', 0);
});
