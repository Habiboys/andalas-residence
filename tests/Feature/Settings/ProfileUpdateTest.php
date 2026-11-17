<?php

use App\Models\City;
use App\Models\Prodi;
use App\Models\Province;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile page carries the shell navigation props for the signed in role', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/profile')
            ->where('page', 'settings-profile')
            ->has('role')
            ->has('initialUser')
            ->has('profileSummary'));
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('users cannot delete their account from settings', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->delete(route('profile.edit'), ['password' => 'password'])->assertStatus(405);

    $this->assertAuthenticatedAs($user);
    expect($user->fresh())->not->toBeNull();
});

test('student can update all editable identity, academic, and address fields from profile settings', function () {
    $f = toBeFixture('local_non_kipk', 2);
    $s1Prodi = Prodi::create([
        'name' => 'Informatika',
        'jenjang' => 'S1',
        'departemen_id' => $f['program']->departemen_id,
    ]);
    $f['program']->update(['jenjang' => 'S3']);
    $f['user']->update(['gender' => 'laki_laki', 'no_hp' => '08111111111']);
    $province = Province::create(['name' => 'Sumatera Barat']);
    $city = City::create(['name' => 'Kota Padang', 'province_id' => $province->id]);

    $this->actingAs($f['user'])
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('hasStudentProfile', true)
            ->where('academicLocked', false)
            ->where('editableProfile.prodi_id', $f['program']->id));

    $this->actingAs($f['user'])
        ->patch(route('profile.update'), [
            'name' => 'Putri Updated',
            'email' => 'putri.updated@example.com',
            'no_hp' => '081234567890',
            'gender' => 'perempuan',
            'email_pribadi' => 'pribadi@example.com',
            'nik' => '1371012345678901',
            'prodi_id' => $s1Prodi->id,
            'city_id' => $city->id,
            'alamat' => 'Jl. Limau Manis No. 10',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $f['user']->refresh();
    $f['profile']->refresh();

    expect($f['user']->nama)->toBe('Putri Updated')
        ->and($f['user']->no_hp)->toBe('081234567890')
        ->and($f['user']->gender)->toBe('perempuan')
        ->and($f['profile']->email_pribadi)->toBe('pribadi@example.com')
        ->and($f['profile']->nik)->toBe('1371012345678901')
        ->and($f['profile']->prodi_id)->toBe($s1Prodi->id)
        ->and($f['profile']->city_id)->toBe($city->id)
        ->and($f['profile']->alamat)->toBe('Jl. Limau Manis No. 10');
});

test('student with active registration cannot alter gender or program studi from profile while contact edits remain allowed', function () {
    $f = toBeFixture('local_non_kipk', 2);
    toBeSubmit($f);
    $otherProdi = Prodi::create([
        'name' => 'Teknik Sipil',
        'jenjang' => 'S1',
        'departemen_id' => $f['program']->departemen_id,
    ]);
    $originalGender = $f['user']->gender;

    $this->actingAs($f['user'])
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('academicLocked', true));

    $this->actingAs($f['user'])
        ->patch(route('profile.update'), [
            'name' => $f['user']->nama,
            'email' => $f['user']->email,
            'gender' => $originalGender === 'perempuan' ? 'laki_laki' : 'perempuan',
            'prodi_id' => $otherProdi->id,
        ])
        ->assertSessionHasErrors(['gender', 'prodi_id']);

    $this->actingAs($f['user'])
        ->patch(route('profile.update'), [
            'name' => 'Tetap Berubah',
            'email' => $f['user']->email,
            'no_hp' => '082233445566',
            'gender' => $originalGender,
            'prodi_id' => $f['program']->id,
            'alamat' => 'Alamat baru',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($f['user']->fresh()->no_hp)->toBe('082233445566')
        ->and($f['profile']->fresh()->alamat)->toBe('Alamat baru');
});
