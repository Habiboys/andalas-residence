<?php

use App\Models\User;
use Database\Seeders\ResidenceRegistrationUatSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Hash;

it('provides all UAT roles and degree profiles with password login without environment settings', function () {
    $this->withoutVite();
    $f = toBeFixture();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ResidenceRegistrationUatSeeder::class);
    expect(User::where('email', 'like', 'uat.%@example.test')->count())->toBe(13);
    foreach (['s2' => 'S2', 's3' => 'S3', 'teman' => 'S1', 'lokal' => 'S1', 'bulanan' => 'S1'] as $name => $degree) {
        $user = User::where('email', 'uat.'.$name.'@example.test')->sole();
        expect($user->mahasiswaProfil->prodi->jenjang)->toBe($degree);
        expect($user->hasRole('mahasiswa'))->toBeTrue();
        expect($user->mahasiswaProfil->residenceRegistrations()->count())->toBe(0);
    }
    expect(User::where('email', 'uat.bulanan@example.test')->sole()->mahasiswaProfil->angkatan)->toEqual(2025);
    foreach (User::where('email', 'like', 'uat.%@example.test')->get() as $user) {
        expect(Hash::check('password', $user->password))->toBeTrue();
        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password'])->assertRedirect();
        $this->assertAuthenticatedAs($user);
        $this->post(route('logout'));
    }
    $this->seed(ResidenceRegistrationUatSeeder::class);
    expect(User::where('email', 'like', 'uat.%@example.test')->count())->toBe(13);
    expect(Hash::check('password', $f['user']->fresh()->password))->toBeTrue();
});
