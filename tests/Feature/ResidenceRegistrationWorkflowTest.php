<?php

use App\Enums\ResidenceRegistrationStatus;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\Periode;
use App\Models\ResidenceRegistration;
use App\Models\User;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

function registrationStudent(): array
{
    $user = User::factory()->student()->create();
    $profile = MahasiswaProfil::query()->create([
        'user_id' => $user->id,
        'barcode_code' => Str::uuid()->toString(),
    ]);
    $periode = Periode::query()->create([
        'nama_periode' => '2026/2027',
        'status' => 'aktif',
        'tanggal_mulai' => '2026-08-01',
        'tanggal_selesai' => '2027-07-31',
    ]);

    return [$user, $profile, $periode];
}

function registrationRoom(int $capacity = 2, string $status = 'kosong'): Kamar
{
    $building = Gedung::query()->create(['kode_gedung' => Str::random(8), 'nama_gedung' => 'Asrama']);
    $floor = Lantai::query()->create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);

    return Kamar::query()->create([
        'lantai_id' => $floor->id,
        'nomor_kamar' => Str::random(6),
        'kapasitas' => $capacity,
        'status' => $status,
    ]);
}

it('submits a non KIPK registration with ordered ready room preferences', function () {
    [$user, $profile, $periode] = registrationStudent();
    $firstRoom = registrationRoom();
    $secondRoom = registrationRoom();

    $response = $this->actingAs($user)->from('/mahasiswa/dashboard')->post(route('andalas.registrations.store'), [
        'periode_id' => $periode->id,
        'is_kipk' => false,
        'preferences' => [
            ['kamar_id' => $firstRoom->id],
            ['kamar_id' => $secondRoom->id],
        ],
    ]);

    $response->assertRedirect('/mahasiswa/dashboard')->assertSessionHasNoErrors();
    $registration = ResidenceRegistration::query()->where('student_profile_id', $profile->id)->firstOrFail();
    expect($registration->status)->toBe(ResidenceRegistrationStatus::Submitted)
        ->and($registration->roomPreferences->pluck('priority')->all())->toBe([1, 2])
        ->and($registration->statusHistories)->toHaveCount(1);
});

it('requires preferences for non KIPK and skips them for KIPK', function () {
    [$user, $profile, $periode] = registrationStudent();

    $this->actingAs($user)->post(route('andalas.registrations.store'), [
        'periode_id' => $periode->id,
        'is_kipk' => false,
    ])->assertSessionHasErrors('preferences');

    $this->actingAs($user)->post(route('andalas.registrations.store'), [
        'periode_id' => $periode->id,
        'is_kipk' => true,
        'preferences' => [['kamar_id' => registrationRoom()->id]],
    ])->assertSessionHasNoErrors();

    expect(ResidenceRegistration::query()->where('student_profile_id', $profile->id)->firstOrFail()->roomPreferences)->toBeEmpty();
});

it('reviews registration through valid transitions and makes accepted student check-in ready', function () {
    [$student, $profile, $periode] = registrationStudent();
    $room = registrationRoom(1);
    $registration = ResidenceRegistration::factory()->create([
        'student_profile_id' => $profile->id,
        'periode_id' => $periode->id,
        'status' => ResidenceRegistrationStatus::Submitted,
        'submitted_at' => now(),
    ]);
    $registration->roomPreferences()->create(['kamar_id' => $room->id, 'priority' => 1]);
    $reviewer = User::factory()->create();
    $reviewer->givePermissionTo(Permission::findOrCreate('registration.review'));

    $this->actingAs($reviewer)->patch(route('andalas.registrations.update', $registration), [
        'status' => ResidenceRegistrationStatus::Verified->value,
    ])->assertSessionHasNoErrors();
    $this->actingAs($reviewer)->patch(route('andalas.registrations.update', $registration), [
        'status' => ResidenceRegistrationStatus::Accepted->value,
        'kamar_id' => $room->id,
    ])->assertSessionHasNoErrors();

    expect($registration->fresh()->status)->toBe(ResidenceRegistrationStatus::Accepted)
        ->and($registration->statusHistories()->count())->toBe(2)
        ->and(PenempatanKamar::query()->where('mahasiswa_id', $profile->id)->where('status', 'aktif')->count())->toBe(1)
        ->and($profile->checkin()->firstOrFail()->status)->toBe('siap_checkin')
        ->and($room->fresh()->status)->toBe('penuh');
});

it('rejects placement when room capacity or one-active-placement invariant is violated', function () {
    [$student, $profile, $periode] = registrationStudent();
    $room = registrationRoom(1);
    $other = registrationStudent()[1];
    PenempatanKamar::query()->create([
        'mahasiswa_id' => $other->id,
        'kamar_id' => $room->id,
        'periode_id' => $periode->id,
        'tanggal_mulai' => now()->toDateString(),
        'status' => 'aktif',
    ]);
    $registration = ResidenceRegistration::factory()->create([
        'student_profile_id' => $profile->id,
        'periode_id' => $periode->id,
        'status' => ResidenceRegistrationStatus::Verified,
    ]);
    $registration->roomPreferences()->create(['kamar_id' => $room->id, 'priority' => 1]);
    $reviewer = User::factory()->create();
    $reviewer->givePermissionTo(Permission::findOrCreate('registration.review'));

    $this->actingAs($reviewer)->patch(route('andalas.registrations.update', $registration), [
        'status' => 'accepted',
        'kamar_id' => $room->id,
    ])->assertSessionHasErrors('kamar_id');

    expect($registration->fresh()->status)->toBe(ResidenceRegistrationStatus::Verified)
        ->and($profile->checkin)->toBeEmpty();
});

it('forbids registration review without permission', function () {
    [$student, $profile, $periode] = registrationStudent();
    $registration = ResidenceRegistration::factory()->create([
        'student_profile_id' => $profile->id,
        'periode_id' => $periode->id,
        'status' => ResidenceRegistrationStatus::Submitted,
    ]);

    $this->actingAs(User::factory()->create())->patch(route('andalas.registrations.update', $registration), [
        'status' => 'verified',
    ])->assertForbidden();
});
