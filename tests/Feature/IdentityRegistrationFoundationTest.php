<?php

use App\Enums\ClientProfileCategory;
use App\Enums\ParentStudentRelationship;
use App\Enums\ResidenceRegistrationStatus;
use App\Models\MahasiswaProfil;
use App\Models\ParentStudentLink;
use App\Models\Periode;
use App\Models\ResidenceRegistration;
use App\Models\ResidenceRegistrationStatusHistory;
use App\Models\RoomPreference;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

it('creates the identity and registration foundation schema', function () {
    expect(Schema::hasColumns('users', ['client_profile_category']))->toBeTrue()
        ->and(Schema::hasColumns('parent_student_links', [
            'parent_user_id', 'student_profile_id', 'relationship', 'is_primary_contact',
        ]))->toBeTrue()
        ->and(Schema::hasColumns('residence_registrations', [
            'student_profile_id', 'periode_id', 'status', 'submitted_at', 'reviewed_by', 'reviewed_at',
        ]))->toBeTrue()
        ->and(Schema::hasColumns('room_preferences', [
            'residence_registration_id', 'kamar_id', 'priority', 'room_type',
        ]))->toBeTrue()
        ->and(Schema::hasColumns('residence_registration_status_histories', [
            'residence_registration_id', 'from_status', 'to_status', 'changed_by',
        ]))->toBeTrue();
});

it('connects parent and student identities', function () {
    $parent = User::factory()->parent()->create();
    $student = User::factory()->student()->create();
    $studentProfile = MahasiswaProfil::query()->create([
        'user_id' => $student->id,
        'barcode_code' => fake()->unique()->uuid(),
    ]);

    $link = ParentStudentLink::factory()->create([
        'parent_user_id' => $parent->id,
        'student_profile_id' => $studentProfile->id,
        'relationship' => ParentStudentRelationship::Guardian,
        'is_primary_contact' => true,
    ]);

    expect($parent->client_profile_category)->toBe(ClientProfileCategory::Parent)
        ->and($student->client_profile_category)->toBe(ClientProfileCategory::Student)
        ->and($link->relationship)->toBe(ParentStudentRelationship::Guardian)
        ->and($link->is_primary_contact)->toBeTrue()
        ->and($parent->parentStudentLinks->first()->is($link))->toBeTrue()
        ->and($studentProfile->parentStudentLinks->first()->parent->is($parent))->toBeTrue();
});

it('connects registration preferences and status history', function () {
    $student = User::factory()->student()->create();
    $studentProfile = MahasiswaProfil::query()->create([
        'user_id' => $student->id,
        'barcode_code' => fake()->unique()->uuid(),
    ]);
    $periode = Periode::query()->create([
        'nama_periode' => '2026/2027',
        'status' => 'aktif',
        'tanggal_mulai' => '2026-08-01',
        'tanggal_selesai' => '2027-07-31',
    ]);
    $reviewer = User::factory()->create();

    $registration = ResidenceRegistration::factory()->create([
        'student_profile_id' => $studentProfile->id,
        'periode_id' => $periode->id,
        'status' => ResidenceRegistrationStatus::Submitted,
        'submitted_at' => now(),
        'reviewed_by' => $reviewer->id,
    ]);
    $preference = RoomPreference::factory()->create([
        'residence_registration_id' => $registration->id,
        'priority' => 1,
    ]);
    $history = ResidenceRegistrationStatusHistory::factory()->create([
        'residence_registration_id' => $registration->id,
        'changed_by' => $reviewer->id,
    ]);

    expect($registration->status)->toBe(ResidenceRegistrationStatus::Submitted)
        ->and($registration->studentProfile->is($studentProfile))->toBeTrue()
        ->and($registration->periode->is($periode))->toBeTrue()
        ->and($registration->reviewer->is($reviewer))->toBeTrue()
        ->and($registration->roomPreferences->first()->is($preference))->toBeTrue()
        ->and($registration->statusHistories->first()->is($history))->toBeTrue()
        ->and($history->from_status)->toBe(ResidenceRegistrationStatus::Draft)
        ->and($history->to_status)->toBe(ResidenceRegistrationStatus::Submitted);
});

it('keeps separate registration attempts for one student and period as history', function () {
    $student = User::factory()->student()->create();
    $studentProfile = MahasiswaProfil::query()->create([
        'user_id' => $student->id,
        'barcode_code' => fake()->unique()->uuid(),
    ]);
    $periode = Periode::query()->create([
        'nama_periode' => '2026/2027',
        'status' => 'aktif',
        'tanggal_mulai' => '2026-08-01',
        'tanggal_selesai' => '2027-07-31',
    ]);

    $first = ResidenceRegistration::factory()->create([
        'student_profile_id' => $studentProfile->id,
        'periode_id' => $periode->id,
    ]);

    $second = ResidenceRegistration::factory()->create([
        'student_profile_id' => $studentProfile->id,
        'periode_id' => $periode->id,
    ]);

    expect($second->id)->not->toBe($first->id)
        ->and(ResidenceRegistration::where('student_profile_id', $studentProfile->id)->count())->toBe(2);
});
