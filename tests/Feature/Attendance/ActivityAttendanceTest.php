<?php

use App\Actions\Attendance\CloseAttendanceSession;
use App\Actions\Attendance\OpenAttendanceSession;
use App\Actions\Attendance\RecordAttendanceAttempt;
use App\Enums\AttendanceRejectionReason;
use App\Enums\ResidenceEvent;
use App\Models\ActivityAttendance;
use App\Models\Kegiatan;
use App\Models\MahasiswaProfil;
use App\Models\ResidenceHistory;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

function attendanceStudent(array $overrides = []): MahasiswaProfil
{
    $user = User::factory()->create();

    return MahasiswaProfil::create(array_merge([
        'user_id' => $user->id,
        'barcode_code' => Str::random(32),
        'status_huni' => 'aktif',
        'tanggal_masuk' => now()->subMonths(3)->toDateString(),
    ], $overrides));
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

it('rejects residents after their first residence year', function () {
    $this->travelTo(Carbon::parse('2026-09-15 09:00:00'));
    $student = attendanceStudent(['tanggal_masuk' => '2025-09-14']);
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
