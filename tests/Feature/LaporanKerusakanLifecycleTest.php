<?php

use App\Actions\DamageReports\ClaimDamageReport;
use App\Actions\DamageReports\CompleteDamageReport;
use App\Actions\DamageReports\CreateDamageReport;
use App\Actions\DamageReports\TriageDamageReport;
use App\Enums\LaporanKerusakanStatus;
use App\Models\Aset;
use App\Models\FasilitasUmum;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\LaporanKerusakan;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;
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

it('shows only reportable inventory and the residents own report history', function () {
    $fixture = activeResidentFixture();
    $other = activeResidentFixture();
    $asset = Aset::create(['kamar_id' => $fixture['room']->id, 'kode_inventaris' => 'OWN-01', 'nama_aset' => 'Lemari', 'kategori' => 'Furniture']);
    Aset::create(['kamar_id' => $other['room']->id, 'kode_inventaris' => 'OTHER-01', 'nama_aset' => 'Meja', 'kategori' => 'Furniture']);
    (new CreateDamageReport)->handle($other['resident'], 'Laporan pribadi');

    $this->actingAs($fixture['resident'])->get(route('mahasiswa.lapor-kerusakan'))
        ->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
        ->where('can_report', true)->where('room.id', $fixture['room']->id)
        ->has('assets', 1)->where('assets.0.id', $asset->id)->has('reports', 0));
});

it('records the selected room asset and required uploaded photo through the resident endpoint', function () {
    Storage::fake('local');
    $fixture = activeResidentFixture();
    $fixture['resident']->givePermissionTo(Permission::findOrCreate('tiket.create'));
    $asset = Aset::create(['kamar_id' => $fixture['room']->id, 'kode_inventaris' => 'OWN-01', 'nama_aset' => 'Lemari', 'kategori' => 'Furniture']);

    $this->actingAs($fixture['resident'])->post(route('andalas.laporan.store'), [
        'aset_id' => $asset->id,
        'deskripsi' => 'Engsel lemari patah',
        'foto_awal' => [UploadedFile::fake()->image('engsel.jpg')],
    ])->assertSessionHasNoErrors()->assertRedirect();

    $report = LaporanKerusakan::sole();
    expect($report->aset_id)->toBe($asset->id)->and($report->kamar_id)->toBe($fixture['room']->id);
    Storage::disk('local')->assertExists($report->photos()->sole()->path);
});

it('rejects an asset from another room and removes its rejected upload', function () {
    Storage::fake('local');
    $fixture = activeResidentFixture();
    $other = activeResidentFixture();
    $fixture['resident']->givePermissionTo(Permission::findOrCreate('tiket.create'));
    $asset = Aset::create(['kamar_id' => $other['room']->id, 'kode_inventaris' => 'OTHER-01', 'nama_aset' => 'Lemari', 'kategori' => 'Furniture']);

    $this->actingAs($fixture['resident'])->post(route('andalas.laporan.store'), [
        'aset_id' => $asset->id, 'deskripsi' => 'Rusak',
        'foto_awal' => [UploadedFile::fake()->image('rusak.jpg')],
    ])->assertSessionHasErrors(['aset_id' => 'Pilih barang di kamar Anda atau fasilitas umum gedung Anda yang masih digunakan.']);

    $this->assertDatabaseCount('laporan_kerusakan', 0);
    expect(Storage::disk('local')->allFiles())->toBeEmpty();
});

it('requires both the selected inventory item and damage photos', function () {
    $fixture = activeResidentFixture();
    $fixture['resident']->givePermissionTo(Permission::findOrCreate('tiket.create'));

    $this->actingAs($fixture['resident'])->post(route('andalas.laporan.store'), ['deskripsi' => 'Rusak'])
        ->assertSessionHasErrors(['aset_id', 'foto_awal']);
    $this->assertDatabaseCount('laporan_kerusakan', 0);
});

it('records shared facility damage without attributing it to the residents room', function () {
    $fixture = activeResidentFixture();
    $facility = FasilitasUmum::create(['gedung_id' => $fixture['room']->lantai->gedung_id, 'nama_fasilitas' => 'Dapur', 'kategori' => 'dapur']);
    $asset = Aset::create(['fasilitas_umum_id' => $facility->id, 'kode_inventaris' => 'COMMON-01', 'nama_aset' => 'Kompor', 'kategori' => 'Dapur']);

    $report = (new CreateDamageReport)->handle($fixture['resident'], 'Kompor rusak', [], $asset->id);

    expect($report->aset_id)->toBe($asset->id)->and($report->kamar_id)->toBeNull();
});

it('lets a technician start an incoming report directly and records the real previous status', function () {
    $fixture = activeResidentFixture();
    $report = (new CreateDamageReport)->handle($fixture['resident'], 'Lampu mati');
    $technician = damageReportUser('teknisi');

    $claimed = (new ClaimDamageReport)->handle($report, $technician);

    expect($claimed->status)->toBe(LaporanKerusakanStatus::SedangDikerjakan);
    $this->assertDatabaseHas('laporan_kerusakan_status_histories', [
        'laporan_kerusakan_id' => $report->id, 'from_status' => 'menunggu_triage', 'to_status' => 'sedang_dikerjakan',
    ]);
});

it('requires completion photos and updates the specific repaired asset', function () {
    Storage::fake('local');
    $fixture = activeResidentFixture();
    $asset = Aset::create(['kamar_id' => $fixture['room']->id, 'kode_inventaris' => 'FIX-01', 'nama_aset' => 'Keran', 'kategori' => 'Plumbing', 'kondisi' => 'rusak_ringan']);
    $report = (new CreateDamageReport)->handle($fixture['resident'], 'Keran bocor', ['before/tap.jpg'], $asset->id);
    $technician = damageReportUser('teknisi');
    $technician->givePermissionTo(Permission::findOrCreate('tiket.update'));
    (new ClaimDamageReport)->handle($report, $technician);

    $this->actingAs($technician)->put(route('andalas.tiket.update', $report), [
        'status' => 'selesai', 'catatan_penyelesaian' => 'Keran diperbaiki',
    ])->assertSessionHasErrors('bukti_penyelesaian');
    $this->post(route('andalas.tiket.update', $report), [
        '_method' => 'PUT', 'status' => 'selesai', 'catatan_penyelesaian' => 'Keran diperbaiki',
        'bukti_penyelesaian' => [UploadedFile::fake()->image('tap-after.jpg')],
    ])->assertSessionHasNoErrors();

    expect($report->fresh()->status)->toBe(LaporanKerusakanStatus::Selesai)
        ->and($asset->fresh()->kondisi->value)->toBe('baik');
    Storage::disk('local')->assertExists($report->photos()->where('type', 'after')->sole()->path);
});
