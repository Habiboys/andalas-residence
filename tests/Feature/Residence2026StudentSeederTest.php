<?php

use App\Enums\ClientProfileCategory;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\Periode;
use App\Models\User;
use App\Services\Residence2026StudentImport;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\Residence2026StudentSeeder;
use Spatie\Permission\Models\Role;

function resident2026Record(array $overrides = []): array
{
    return array_replace([
        'nim' => '2610441035', 'nama' => 'Mahasiswa Satu', 'angkatan' => 2026,
        'category' => 'local_non_kipk', 'is_kipk' => false, 'email' => null,
        'gender' => 'perempuan', 'prodi_names' => [], 'issues' => [],
        'checkins' => [['sheet' => 'RPX(ADA KIPK)', 'row' => 3, 'room' => '1A.01', 'nim' => '2610441035']],
        'kipk_deductions' => [],
    ], $overrides);
}

function resident2026Room(int $capacity = 2): Kamar
{
    $building = Gedung::create(['kode_gedung' => 'A', 'nama_gedung' => 'RPX']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);

    return Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => '1A.01', 'kapasitas' => $capacity, 'status' => 'kosong', 'tipe_kamar' => 'standar']);
}

it('previews the supplied reconciliation without database writes', function () {
    $this->artisan('asrama:seed-students-2026', ['--dry-run' => true])->assertSuccessful();
    $this->assertDatabaseCount('users', 0);
    $this->assertDatabaseCount('periode', 0);
    $this->assertDatabaseCount('kipk_recipients', 0);
});

it('creates imported profiles and historical checkins once with an administrative start date', function () {
    $room = resident2026Room();
    $import = app(Residence2026StudentImport::class);
    $data = ['students' => [resident2026Record()], 'unresolved' => []];

    $first = $import->apply($data);
    $user = User::sole();
    $password = $user->password;
    $second = $import->apply($data);

    expect($first['created'])->toBe(1);
    expect($second['matched'])->toBe(1);
    expect($user->fresh()->password)->toBe($password);
    expect($user->email)->toBe('2610441035@import.invalid');
    expect($user->status)->toBe('nonaktif');
    expect($user->email_verified_at)->toBeNull();
    expect($user->hasRole('mahasiswa'))->toBeTrue();
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('mahasiswa_profil', 1);
    $this->assertDatabaseCount('penempatan_kamar', 1);
    expect(PenempatanKamar::sole()->tanggal_mulai->toDateString())->toBe('2026-08-01');
    $this->assertDatabaseHas('penempatan_kamar', ['kamar_id' => $room->id, 'status' => 'aktif']);
    $this->assertDatabaseHas('mahasiswa_profil', ['user_id' => $user->id, 'status_huni' => 'aktif']);
    $this->assertDatabaseCount('tagihan', 0);
    $this->assertDatabaseCount('pembayaran', 0);
});

it('imports older kipk recipients as non freshmen and leaves kipk only students unplaced', function () {
    $record = resident2026Record(['nim' => '2410231024', 'angkatan' => 2024, 'category' => 'student', 'is_kipk' => true, 'checkins' => [], 'email' => 'student@example.test']);
    $import = app(Residence2026StudentImport::class);

    $import->apply(['students' => [$record], 'unresolved' => []]);
    $import->apply(['students' => [$record], 'unresolved' => []]);

    $this->assertDatabaseHas('users', ['nim_nip' => '2410231024', 'client_profile_category' => 'student', 'email' => 'student@example.test']);
    $this->assertDatabaseHas('kipk_recipients', ['nim' => '2410231024', 'angkatan' => 2024]);
    $this->assertDatabaseCount('kipk_recipients', 1);
    $this->assertDatabaseCount('penempatan_kamar', 0);
});

it('preserves existing accounts when source category name or email conflicts', function () {
    Role::create(['name' => 'mahasiswa', 'guard_name' => 'web']);
    $user = User::factory()->create(['nim_nip' => '2610441035', 'nama' => 'Mahasiswa Satu', 'client_profile_category' => ClientProfileCategory::LocalNonKipk])->assignRole('mahasiswa');
    $password = $user->password;
    $import = app(Residence2026StudentImport::class);
    $records = [
        resident2026Record(['category' => 'local_kipk', 'is_kipk' => true]),
        resident2026Record(['nim' => '2610441036', 'email' => $user->email]),
        resident2026Record(['nim' => '2610441037', 'issues' => ['name_mismatch']]),
    ];

    $result = $import->apply(['students' => $records, 'unresolved' => []]);

    expect($result['skipped'])->toBe(3);
    expect($user->fresh()->password)->toBe($password);
    expect($user->fresh()->client_profile_category)->toBe(ClientProfileCategory::LocalNonKipk);
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('kipk_recipients', 0);
    $this->assertDatabaseCount('mahasiswa_profil', 0);
});

it('counts unresolved occupants before placing students so overcapacity is never imported', function () {
    resident2026Room(1);
    $record = resident2026Record();
    $unresolved = ['source' => 'checkins', 'sheet' => 'RPX(ADA KIPK)', 'row' => 4, 'room' => '1A.01', 'nim' => ''];
    $import = app(Residence2026StudentImport::class);

    $result = $import->apply(['students' => [$record], 'unresolved' => [$unresolved]]);

    expect($result['pending_rooms'])->toBe(1);
    $this->assertDatabaseCount('penempatan_kamar', 0);
    $this->assertDatabaseHas('mahasiswa_profil', ['status_huni' => 'calon']);
});

it('does not place imported students in maintenance rooms or missing rooms', function (bool $maintenance) {
    if ($maintenance) {
        resident2026Room()->update(['status' => 'maintenance']);
    }
    $import = app(Residence2026StudentImport::class);

    $result = $import->apply(['students' => [resident2026Record()], 'unresolved' => []]);

    expect($result['pending_rooms'])->toBe(1);
    $this->assertDatabaseCount('penempatan_kamar', 0);
})->with(['maintenance' => true, 'missing' => false]);

it('matches an existing student without replacing contact credentials or completed residence history', function () {
    Role::create(['name' => 'mahasiswa', 'guard_name' => 'web']);
    $user = User::factory()->create(['nim_nip' => '2610441035', 'nama' => 'Mahasiswa Satu', 'client_profile_category' => ClientProfileCategory::LocalNonKipk])->assignRole('mahasiswa');
    MahasiswaProfil::create(['user_id' => $user->id, 'angkatan' => '2026', 'barcode_code' => 'EXISTING', 'status_huni' => 'keluar']);
    resident2026Room();
    $email = $user->email;

    $result = app(Residence2026StudentImport::class)->apply(['students' => [resident2026Record()], 'unresolved' => []]);

    expect($result['matched'])->toBe(1);
    expect($user->fresh()->email)->toBe($email);
    $this->assertDatabaseHas('mahasiswa_profil', ['user_id' => $user->id, 'status_huni' => 'keluar', 'barcode_code' => 'EXISTING']);
    $this->assertDatabaseCount('penempatan_kamar', 0);
});

it('rolls back the import if an existing profile cohort contradicts the nim', function () {
    Role::create(['name' => 'mahasiswa', 'guard_name' => 'web']);
    $user = User::factory()->create(['nim_nip' => '2610441035', 'nama' => 'Mahasiswa Satu', 'client_profile_category' => ClientProfileCategory::LocalNonKipk])->assignRole('mahasiswa');
    MahasiswaProfil::create(['user_id' => $user->id, 'angkatan' => '2025', 'barcode_code' => 'EXISTING', 'status_huni' => 'calon']);
    $records = [resident2026Record(['nim' => '2610441036', 'checkins' => []]), resident2026Record()];

    expect(fn () => app(Residence2026StudentImport::class)->apply(['students' => $records, 'unresolved' => []]))->toThrow(LogicException::class);

    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('periode', 0);
});

it('seeds the real reconciled dataset against the building and academic masters', function () {
    $this->seed(DatabaseSeeder::class);
    $import = app(Residence2026StudentImport::class);
    $data = $import->read();

    $result = $import->apply($data);
    $this->seed(Residence2026StudentSeeder::class);

    expect($data['students'])->toHaveCount(1474);
    expect($data['unresolved'])->toHaveCount(156);
    expect(collect($data['students'])->pluck('nim')->unique())->toHaveCount(1474);
    expect($result['created'])->toBe(0);
    expect($result['matched'])->toBe(1464);
    expect($result['skipped'])->toBe(10);
    expect($result['pending_rooms'])->toBe(0);
    $this->assertDatabaseCount('users', 1477);
    $this->assertDatabaseCount('mahasiswa_profil', 1467);
    $this->assertDatabaseMissing('users', ['email' => 'mahasiswa.kipk@unand.ac.id']);
    $this->assertDatabaseMissing('users', ['email' => 'mahasiswa.nonkipk@unand.ac.id']);
    $this->assertDatabaseMissing('users', ['email' => 'mahasiswa.penghuni@unand.ac.id']);
    expect(User::where('email', 'like', '%@example.test')->pluck('email')->all())->toBe(['superadmin@example.test']);
    $this->assertDatabaseHas('users', ['email' => 'international@unand.ac.id', 'client_profile_category' => 'international_free_facility']);
    $this->assertDatabaseHas('users', ['email' => 'international.paid@unand.ac.id', 'client_profile_category' => 'international_student']);
    $this->assertDatabaseHas('users', ['email' => 'nonmahasiswa@unand.ac.id', 'client_profile_category' => 'non_student']);
    expect(Gedung::where('kode_gedung', 'like', 'DEMO-%')->count())->toBe(0);
    $this->assertDatabaseCount('pembayaran', 0);
    foreach (Kamar::withCount(['penempatanKamar as occupied' => fn ($query) => $query->where('status', 'aktif')])->get() as $room) {
        expect($room->occupied)->toBeLessThanOrEqual($room->kapasitas);
    }
});

it('uses the existing period start date and restores the phone prefix without verifying email', function () {
    resident2026Room();
    Periode::create(['nama_periode' => '2026/2027', 'status' => 'aktif', 'angkatan_maba' => 2026, 'tanggal_mulai' => '2026-08-10', 'tanggal_selesai' => '2027-07-31']);
    $record = resident2026Record(['email' => 'student@example.test']);
    $record['checkins'][0]['phone'] = '85187134350';

    app(Residence2026StudentImport::class)->apply(['students' => [$record], 'unresolved' => []]);

    expect(PenempatanKamar::sole()->tanggal_mulai->toDateString())->toBe('2026-08-10');
    $this->assertDatabaseHas('users', ['no_hp' => '085187134350', 'email_verified_at' => null, 'status' => 'aktif']);
    $this->assertDatabaseCount('periode', 1);
});

it('keeps both imported accounts inactive when they share a source email', function () {
    $records = [resident2026Record(['email' => 'shared@example.test', 'checkins' => []]), resident2026Record(['nim' => '2610441036', 'email' => 'shared@example.test', 'checkins' => []])];

    $result = app(Residence2026StudentImport::class)->apply(['students' => $records, 'unresolved' => []]);

    expect($result['created'])->toBe(2);
    expect($result['pending_email'])->toBe(2);
    $this->assertDatabaseMissing('users', ['email' => 'shared@example.test']);
    $this->assertDatabaseHas('users', ['nim_nip' => '2610441035', 'status' => 'nonaktif']);
    $this->assertDatabaseHas('users', ['nim_nip' => '2610441036', 'status' => 'nonaktif']);
});

it('refuses to place a matched account whose gender disagrees with the building', function () {
    resident2026Room();
    Role::create(['name' => 'mahasiswa', 'guard_name' => 'web']);
    User::factory()->create(['nim_nip' => '2610441035', 'nama' => 'Mahasiswa Satu', 'client_profile_category' => ClientProfileCategory::LocalNonKipk, 'gender' => 'laki_laki'])->assignRole('mahasiswa');

    $result = app(Residence2026StudentImport::class)->apply(['students' => [resident2026Record()], 'unresolved' => []]);

    expect($result['pending_rooms'])->toBe(1);
    $this->assertDatabaseCount('penempatan_kamar', 0);
});
