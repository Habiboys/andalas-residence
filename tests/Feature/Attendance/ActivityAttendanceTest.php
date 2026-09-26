<?php

use App\Actions\Attendance\CloseAttendanceSession;
use App\Actions\Attendance\OpenAttendanceSession;
use App\Actions\Attendance\RecordAttendanceAttempt;
use App\Enums\AttendanceRejectionReason;
use App\Enums\ResidenceEvent;
use App\Models\ActivityAttendance;
use App\Models\AttendanceSession;
use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Kegiatan;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\Periode;
use App\Models\ResidenceHistory;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

function attendanceStudent(array $overrides = [], int $periodCohort = 2026): MahasiswaProfil
{
    $user = User::factory()->student()->create();
    $student = MahasiswaProfil::create(array_merge([
        'user_id' => $user->id,
        'barcode_code' => Str::random(32),
        'angkatan' => '2026',
        'status_huni' => 'aktif',
        'tanggal_masuk' => now()->subMonths(3)->toDateString(),
    ], $overrides));

    Periode::where('status', 'aktif')->update(['status' => 'nonaktif']);
    Periode::create(['nama_periode' => 'Periode '.$periodCohort, 'status' => 'aktif', 'angkatan_maba' => $periodCohort, 'tanggal_mulai' => now()->startOfYear(), 'tanggal_selesai' => now()->endOfYear()]);
    $building = Gedung::create(['kode_gedung' => 'ATT-'.Str::random(6), 'nama_gedung' => 'Asrama Uji']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => Str::random(6), 'kapasitas' => 2, 'status' => 'terisi_sebagian']);
    PenempatanKamar::create(['mahasiswa_id' => $student->id, 'kamar_id' => $room->id, 'tanggal_mulai' => now()->subMonth(), 'status' => 'aktif']);

    return $student;
}

function attendanceSession(array $overrides = []): array
{
    $facilitator = User::factory()->create();
    $activity = Kegiatan::create([
        'judul' => 'Kegiatan wajib',
        'tanggal_mulai' => now()->subHour(),
        'tanggal_selesai' => now()->addHours(2),
        'dibuat_oleh' => $facilitator->id,
    ]);

    return app(OpenAttendanceSession::class)->handle(
        $activity,
        $facilitator,
        $overrides['expires_at'] ?? now()->addMinutes(10),
        -0.9145000,
        100.4600000,
        $overrides['radius_meters'] ?? 100,
        $overrides['maximum_accuracy_meters'] ?? 30,
    );
}

function recordAttendance(array $sessionData, MahasiswaProfil $student, array $overrides = [])
{
    return app(RecordAttendanceAttempt::class)->handle(
        $sessionData['session'],
        $student,
        $overrides['token'] ?? $sessionData['token'],
        $overrides['latitude'] ?? -0.9145000,
        $overrides['longitude'] ?? 100.4601000,
        $overrides['accuracy_meters'] ?? 10,
    );
}

it('accepts an eligible first-year resident inside the geofence using server time', function () {
    $this->travelTo(Carbon::parse('2026-09-15 09:00:00'));
    $student = attendanceStudent(['tanggal_masuk' => '2026-01-01']);
    $sessionData = attendanceSession();

    $attempt = recordAttendance($sessionData, $student);

    expect($attempt->rejection_reason)->toBeNull()
        ->and($attempt->attempted_at->toDateTimeString())->toBe('2026-09-15 09:00:00')
        ->and($attempt->distance_meters)->toBeLessThan(100.0);
    expect(ActivityAttendance::where('mahasiswa_id', $student->id)->count())->toBe(1);
});

it('rejects a location outside the radius', function () {
    $student = attendanceStudent();
    $sessionData = attendanceSession();

    $attempt = recordAttendance($sessionData, $student, ['latitude' => -0.9045000]);

    expect($attempt->rejection_reason)->toBe(AttendanceRejectionReason::OutsideRadius)
        ->and($attempt->distance_meters)->toBeGreaterThan(1000.0);
    expect(ActivityAttendance::count())->toBe(0);
});

it('accepts later cohorts during their first residence year', function () {
    $this->travelTo(Carbon::parse('2027-09-15 09:00:00'));
    $student = attendanceStudent(['angkatan' => '2027', 'tanggal_masuk' => '2027-08-01'], 2027);

    expect(recordAttendance(attendanceSession(), $student)->rejection_reason)->toBeNull();
    $this->assertDatabaseHas('activity_attendances', ['mahasiswa_id' => $student->id]);
});

it('enforces the facilitators live geofence through student scan requests', function () {
    $this->freezeTime();
    $data = attendanceSession();
    $owner = $data['session']->facilitator;
    $owner->givePermissionTo(Permission::findOrCreate('attendance.session.manage'));
    $student = attendanceStudent();
    $student->user->givePermissionTo(Permission::findOrCreate('absensi.scan'));
    $scan = ['token' => $data['token'], 'latitude' => -0.9145, 'longitude' => 100.46, 'accuracy_meters' => 5];

    $this->actingAs($owner)->post(route('andalas.absensi.sesi.location', $data['session']), [
        'latitude' => -0.9045, 'longitude' => 100.46, 'accuracy_meters' => 5,
    ])->assertSessionHasNoErrors();
    $this->actingAs($student->user)->post(route('andalas.absensi.sesi.record', $data['session']), $scan)->assertSessionHasNoErrors();
    $this->assertDatabaseCount('activity_attendances', 0);
    $this->assertDatabaseHas('attendance_attempts', ['mahasiswa_id' => $student->id, 'rejection_reason' => 'facilitator_unavailable']);

    $this->actingAs($owner)->post(route('andalas.absensi.sesi.location', $data['session']), [
        'latitude' => -0.9145, 'longitude' => 100.46, 'accuracy_meters' => 5,
    ])->assertSessionHasNoErrors();
    $this->actingAs($student->user)->post(route('andalas.absensi.sesi.record', $data['session']), $scan)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('activity_attendances', ['mahasiswa_id' => $student->id, 'attendance_session_id' => $data['session']->id]);
});

it('rejects an expired QR token', function () {
    $this->travelTo(Carbon::parse('2026-09-15 09:00:00'));
    $student = attendanceStudent();
    $sessionData = attendanceSession(['expires_at' => now()->addMinute()]);
    $this->travelTo(Carbon::parse('2026-09-15 09:01:01'));

    $attempt = recordAttendance($sessionData, $student);

    expect($attempt->rejection_reason)->toBe(AttendanceRejectionReason::TokenExpired);
    expect(ActivityAttendance::count())->toBe(0);
});

it('stores only a hash and rejects a different QR token', function () {
    $student = attendanceStudent();
    $sessionData = attendanceSession();

    $attempt = recordAttendance($sessionData, $student, ['token' => 'wrong-token']);

    expect($sessionData['session']->qr_token_hash)->not->toBe($sessionData['token'])
        ->and($attempt->rejection_reason)->toBe(AttendanceRejectionReason::TokenInvalid);
});

it('keeps one final attendance and records a duplicate attempt', function () {
    $student = attendanceStudent();
    $sessionData = attendanceSession();
    recordAttendance($sessionData, $student);

    $duplicate = recordAttendance($sessionData, $student);

    expect($duplicate->rejection_reason)->toBe(AttendanceRejectionReason::Duplicate);
    expect(ActivityAttendance::where('mahasiswa_id', $student->id)->count())->toBe(1);
});

it('rejects inaccurate location readings', function () {
    $student = attendanceStudent();
    $sessionData = attendanceSession(['maximum_accuracy_meters' => 20]);

    $attempt = recordAttendance($sessionData, $student, ['accuracy_meters' => 20.01]);

    expect($attempt->rejection_reason)->toBe(AttendanceRejectionReason::LocationInaccurate);
    expect(ActivityAttendance::count())->toBe(0);
});

it('stops accepting attempts after an early close', function () {
    $student = attendanceStudent();
    $sessionData = attendanceSession();
    app(CloseAttendanceSession::class)->handle($sessionData['session']);

    $attempt = recordAttendance($sessionData, $student);

    expect($attempt->rejection_reason)->toBe(AttendanceRejectionReason::SessionNotOpen)
        ->and($sessionData['session']->refresh()->closed_at)->not->toBeNull();
});

it('rejects a resident whose cohort predates the active admission period', function () {
    $this->travelTo(Carbon::parse('2026-09-15 09:00:00'));
    $student = attendanceStudent(['angkatan' => '2025', 'tanggal_masuk' => '2025-09-14']);
    $sessionData = attendanceSession();

    $attempt = recordAttendance($sessionData, $student);

    expect($attempt->rejection_reason)->toBe(AttendanceRejectionReason::Ineligible);
});

it('uses historical checkout and re-entry without resetting the first residence year', function () {
    $this->travelTo(Carbon::parse('2026-09-15 09:00:00'));
    $student = attendanceStudent(['tanggal_masuk' => null]);
    ResidenceHistory::create(['mahasiswa_id' => $student->id, 'event' => ResidenceEvent::Entered, 'occurred_at' => '2025-01-01']);
    ResidenceHistory::create(['mahasiswa_id' => $student->id, 'event' => ResidenceEvent::CheckedOut, 'occurred_at' => '2025-06-01']);
    ResidenceHistory::create(['mahasiswa_id' => $student->id, 'event' => ResidenceEvent::Reentered, 'occurred_at' => '2026-09-01']);
    $sessionData = attendanceSession();

    $attempt = recordAttendance($sessionData, $student);

    expect($attempt->rejection_reason)->toBe(AttendanceRejectionReason::Ineligible);
});

it('rejects a currently checked-out first-year resident', function () {
    $student = attendanceStudent();
    ResidenceHistory::create(['mahasiswa_id' => $student->id, 'event' => ResidenceEvent::Entered, 'occurred_at' => now()->subMonths(3)]);
    ResidenceHistory::create(['mahasiswa_id' => $student->id, 'event' => ResidenceEvent::CheckedOut, 'occurred_at' => now()->subDay()]);
    $sessionData = attendanceSession();

    $attempt = recordAttendance($sessionData, $student);

    expect($attempt->rejection_reason)->toBe(AttendanceRejectionReason::Ineligible);
});

it('rejects attendance when the facilitator leaves the radius or location expires', function (string $case) {
    $this->freezeTime();
    $student = attendanceStudent();
    $data = attendanceSession();
    if ($case === 'outside') {
        $data['session']->update(['facilitator_latitude' => -0.9045]);
    } else {
        $this->travel(61)->seconds();
    }

    $attempt = recordAttendance($data, $student);

    expect($attempt->rejection_reason)->toBe(AttendanceRejectionReason::FacilitatorUnavailable);
    $this->assertDatabaseCount('activity_attendances', 0);
})->with(['outside', 'stale']);

it('rejects a returning resident even within the first year', function () {
    $student = attendanceStudent();
    ResidenceHistory::create(['mahasiswa_id' => $student->id, 'event' => ResidenceEvent::CheckedOut, 'occurred_at' => now()->subDay()]);
    ResidenceHistory::create(['mahasiswa_id' => $student->id, 'event' => ResidenceEvent::Reentered, 'occurred_at' => now()->subHour()]);

    $attempt = recordAttendance(attendanceSession(), $student);

    expect($attempt->rejection_reason)->toBe(AttendanceRejectionReason::Ineligible);
});

it('rejects missing cohorts and clients who are not local first-year students', function (string $category, ?string $cohort) {
    $student = attendanceStudent(['angkatan' => $cohort]);
    $student->user->update(['client_profile_category' => $category]);

    $attempt = recordAttendance(attendanceSession(), $student);

    expect($attempt->rejection_reason)->toBe(AttendanceRejectionReason::Ineligible);
})->with([
    ['student', null], ['local_non_kipk', '2025'], ['non_student', '2026'], ['international_free_facility', '2026'], ['international_student', '2026'],
]);

it('allows only the sessions facilitator to refresh its location', function () {
    $data = attendanceSession();
    $owner = $data['session']->facilitator;
    $other = User::factory()->create();
    $permission = Permission::findOrCreate('attendance.session.manage');
    $owner->givePermissionTo($permission);
    $other->givePermissionTo($permission);
    $payload = ['latitude' => -0.915, 'longitude' => 100.46, 'accuracy_meters' => 8];

    $this->actingAs($other)->post(route('andalas.absensi.sesi.location', $data['session']), $payload)->assertForbidden();
    $this->actingAs($owner)->post(route('andalas.absensi.sesi.location', $data['session']), $payload)->assertSessionHasNoErrors();

    expect($data['session']->fresh()->facilitator_latitude)->toBe(-0.915);
});

it('rejects attendance at the exact expiry time and after a concurrently closed session', function () {
    $this->freezeTime();
    $student = attendanceStudent();
    $data = attendanceSession(['expires_at' => now()->addMinute()]);
    $this->travel(1)->minutes();

    expect(recordAttendance($data, $student)->rejection_reason)->toBe(AttendanceRejectionReason::TokenExpired);

    $data = attendanceSession();
    AttendanceSession::whereKey($data['session']->id)->update(['closed_at' => now()]);
    expect(recordAttendance($data, $student)->rejection_reason)->toBe(AttendanceRejectionReason::SessionNotOpen);
});

it('allows a facilitator to manage only their activities and preserves attendance history', function () {
    $this->seed(RolePermissionSeeder::class);
    $session = attendanceSession();
    $owner = $session['session']->facilitator->assignRole('fasilitator');
    $other = User::factory()->create()->assignRole('fasilitator');
    $activity = $session['session']->kegiatan;
    $building = Gedung::create(['kode_gedung' => 'OWNER', 'nama_gedung' => 'Asrama Owner']);
    FasilitatorWilayah::create(['user_id' => $owner->id, 'gedung_id' => $building->id]);
    $activity->update(['gedung_id' => $building->id]);
    $this->actingAs($other)->put(route('andalas.kegiatan.update', $activity), [
        'judul' => 'Changed', 'tanggal_selesai' => now()->addHours(2)->toDateTimeString(),
    ])->assertForbidden();
    $this->actingAs($owner)->delete(route('andalas.kegiatan.destroy', $activity))->assertSessionHasErrors('kegiatan');
    $this->assertDatabaseHas('attendance_sessions', ['id' => $session['session']->id]);
    $this->post(route('andalas.kegiatan.store'), [
        'judul' => 'Invalid schedule', 'tanggal_mulai' => now()->toDateTimeString(),
    ])->assertSessionHasErrors(['jenis_kegiatan_id', 'duration_minutes']);
});
