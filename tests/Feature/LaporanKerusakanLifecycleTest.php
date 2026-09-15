<?php

use App\Actions\DamageReports\ClaimDamageReport;
use App\Actions\DamageReports\CompleteDamageReport;
use App\Actions\DamageReports\CreateDamageReport;
use App\Actions\DamageReports\TriageDamageReport;
use App\Enums\LaporanKerusakanStatus;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

function damageReportUser(string $role): User
{
    Role::findOrCreate($role, 'web');
    $user = User::factory()->create();
    $user->assignRole($role);

    return $user;
}

function activeResidentFixture(): array
{
    $resident = damageReportUser('mahasiswa');
    $profile = MahasiswaProfil::create([
        'user_id' => $resident->id,
        'barcode_code' => 'BC-'.$resident->id,
        'status_huni' => 'aktif',
    ]);
    $building = Gedung::create(['kode_gedung' => fake()->unique()->numerify('D-###'), 'nama_gedung' => 'Gedung Uji']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $room = Kamar::create([
        'lantai_id' => $floor->id,
        'nomor_kamar' => fake()->unique()->numerify('DR-###'),
        'kapasitas' => 2,
        'status' => 'terisi_sebagian',
    ]);
    PenempatanKamar::create([
        'mahasiswa_id' => $profile->id,
        'kamar_id' => $room->id,
        'tanggal_mulai' => now()->toDateString(),
        'status' => 'aktif',
    ]);

    return compact('resident', 'profile', 'room');
}

it('allows only an active resident to create a report with private photos and history', function () {
    $fixture = activeResidentFixture();

    $report = (new CreateDamageReport)->handle(
        $fixture['resident'],
        'Keran kamar bocor',
        ['damage-reports/before/one.jpg', 'damage-reports/before/two.jpg'],
    );

    expect($report->status)->toBe(LaporanKerusakanStatus::MenungguTriage)
        ->and($report->kamar_id)->toBe($fixture['room']->id)
        ->and($report->photos)->toHaveCount(2)
        ->and($report->statusHistories)->toHaveCount(1);
    $this->assertDatabaseHas('laporan_kerusakan_photos', ['laporan_kerusakan_id' => $report->id, 'path' => 'damage-reports/before/one.jpg']);
});

it('rejects report creation by a resident without active occupancy', function () {
    $resident = damageReportUser('mahasiswa');
    MahasiswaProfil::create(['user_id' => $resident->id, 'barcode_code' => 'BC-'.$resident->id, 'status_huni' => 'keluar']);

    expect(fn () => (new CreateDamageReport)->handle($resident, 'Kerusakan'))
        ->toThrow(AuthorizationException::class);

    $this->assertDatabaseCount('laporan_kerusakan', 0);
});

it('records triage assignment and technician claim without duplicating assignment history', function () {
    $fixture = activeResidentFixture();
    $admin = damageReportUser('admin');
    $technician = damageReportUser('teknisi');
    $report = (new CreateDamageReport)->handle($fixture['resident'], 'Lampu mati');

    $triaged = (new TriageDamageReport)->handle($report, $admin, $technician, 'Prioritas sedang');
    $claimed = (new ClaimDamageReport)->handle($triaged, $technician);

    expect($claimed->status)->toBe(LaporanKerusakanStatus::SedangDikerjakan)
        ->and($claimed->teknisi_id)->toBe($technician->id)
        ->and($claimed->assignments)->toHaveCount(1)
        ->and($claimed->statusHistories)->toHaveCount(3);
});

it('enforces strict transitions and prevents another technician from claiming', function () {
    $fixture = activeResidentFixture();
    $admin = damageReportUser('admin');
    $assigned = damageReportUser('teknisi');
    $other = damageReportUser('teknisi');
    $report = (new CreateDamageReport)->handle($fixture['resident'], 'Pintu rusak');
    $triaged = (new TriageDamageReport)->handle($report, $admin, $assigned);

    expect(fn () => (new ClaimDamageReport)->handle($triaged, $other))
        ->toThrow(AuthorizationException::class)
        ->and(fn () => (new TriageDamageReport)->handle($triaged, $admin))
        ->toThrow(AuthorizationException::class);

    $this->assertDatabaseHas('laporan_kerusakan', ['id' => $report->id, 'status' => 'didisposisikan', 'teknisi_id' => $assigned->id]);
});

it('requires completion description and evidence then closes assignment', function () {
    $fixture = activeResidentFixture();
    $admin = damageReportUser('admin');
    $technician = damageReportUser('teknisi');
    $report = (new CreateDamageReport)->handle($fixture['resident'], 'Kunci macet');
    $report = (new TriageDamageReport)->handle($report, $admin);
    $report = (new ClaimDamageReport)->handle($report, $technician);

    expect(fn () => (new CompleteDamageReport)->handle($report, $technician, '', []))
        ->toThrow(ValidationException::class);

    $completed = (new CompleteDamageReport)->handle(
        $report,
        $technician,
        'Silinder kunci telah diganti.',
        ['damage-reports/after/completed.jpg'],
    );

    expect($completed->status)->toBe(LaporanKerusakanStatus::Selesai)
        ->and($completed->tanggal_selesai)->not->toBeNull()
        ->and($completed->assignments->first()->ended_at)->not->toBeNull();
    $this->assertDatabaseHas('laporan_kerusakan_photos', ['laporan_kerusakan_id' => $report->id, 'type' => 'after']);
});
