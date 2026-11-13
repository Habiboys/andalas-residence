<?php

use App\Enums\LaporanKerusakanStatus as Status;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Kuesioner;
use App\Models\Lantai;
use App\Models\LaporanKerusakan;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\PenilaianTeknisi;
use App\Models\TechnicianLogbook;
use App\Models\User;
use App\Services\DamageReportRevision;
use App\Services\DamageReportWorkflow;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function finalDamageResident(): array
{
    Role::findOrCreate('mahasiswa');
    $user = User::factory()->create()->assignRole('mahasiswa');
    $user->givePermissionTo(Permission::findOrCreate('tiket.create'));
    $profile = MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => (string) Str::uuid(), 'status_huni' => 'aktif']);
    $building = Gedung::create(['kode_gedung' => 'F-'.Str::random(8), 'nama_gedung' => 'Final UAT']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Satu']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => 'F-'.Str::random(6), 'kapasitas' => 4, 'status' => 'terisi_sebagian']);
    PenempatanKamar::create(['mahasiswa_id' => $profile->id, 'kamar_id' => $room->id, 'tanggal_mulai' => today()->subDay(), 'status' => 'aktif']);

    return compact('user', 'profile', 'room');
}

function finalDamageTechnician(): User
{
    Role::findOrCreate('teknisi');
    $user = User::factory()->create()->assignRole('teknisi');
    $user->givePermissionTo(Permission::findOrCreate('tiket.update'));

    return $user;
}

beforeEach(function () {
    $this->withoutVite();
});

it('keeps descriptions and private initial photos on their individual items', function () {
    Storage::fake('local');
    $f = finalDamageResident();
    $this->actingAs($f['user'])->post(route('andalas.laporan.store'), ['request_key' => (string) Str::uuid(), 'items' => [
        ['description' => 'AC rusak', 'photos' => [UploadedFile::fake()->image('ac.jpg')]],
        ['description' => 'Pintu macet', 'photos' => [UploadedFile::fake()->image('pintu.jpg')]],
    ]])->assertSessionHasNoErrors();
    $r = LaporanKerusakan::sole();
    expect($r->items()->count())->toBe(2);
    foreach ($r->items as $item) {
        expect($item->photos()->count())->toBe(1);
    }
    expect($r->photos()->distinct()->count('item_id'))->toBe(2);
});

it('merges additional items without changing the header ID and makes retries idempotent', function () {
    $f = finalDamageResident();
    $revision = app(DamageReportRevision::class);
    $a = $revision->submit($f['user'], [['description' => 'AC rusak']]);
    $key = (string) Str::uuid();
    $b = $revision->submit($f['user'], [['description' => 'Pintu macet']], null, $key);
    $revision->submit($f['user'], [['description' => 'Pintu macet']], null, $key);
    expect($a->id)->toBe($b->id)->and($a->items()->count())->toBe(2);
    expect(fn () => $revision->submit($f['user'], [['description' => 'Berbeda']], null, $key))->toThrow(ValidationException::class);
});

it('does not append items to a report already being worked on', function () {
    $f = finalDamageResident();
    $revision = app(DamageReportRevision::class);
    $w = app(DamageReportWorkflow::class);
    $a = $revision->submit($f['user'], [['description' => 'AC rusak']]);
    $w->claim($a, finalDamageTechnician());
    $b = $revision->submit($f['user'], [['description' => 'Pintu macet']]);
    expect($a->id)->not->toBe($b->id)->and($a->items()->count())->toBe(1)->and($a->fresh()->status)->toBe(Status::SedangDikerjakan);
});

it('prevents closing a multi-item report until all items are completed', function () {
    $f = finalDamageResident();
    $revision = app(DamageReportRevision::class);
    $w = app(DamageReportWorkflow::class);
    $t = finalDamageTechnician();
    $r = $revision->submit($f['user'], [['description' => 'AC rusak'], ['description' => 'Pintu macet'], ['description' => 'Lampu mati']]);
    $r = $w->claim($r, $t);
    $items = $r->items;
    $revision->completeItem($items[0], $t, 'AC baik', []);
    $revision->completeItem($items[1], $t, 'Pintu baik', []);
    expect(fn () => $w->complete($r, $t, 'Selesai', ['after/final.jpg']))->toThrow(ValidationException::class);
    expect($r->fresh()->status)->toBe(Status::SedangDikerjakan);
    $this->assertDatabaseCount('damage_report_notifications', 0);
    $revision->completeItem($items[2], $t, 'Lampu baik', []);
    $w->complete($r, $t, 'Semua baik', ['after/final.jpg']);
    expect($r->fresh()->status)->toBe(Status::Selesai)->and($r->progress()->where('description', 'like', 'Penyelesaian:%')->count())->toBe(1);
});

it('records participants and final completion atomically without leaking assignment changes on rejection', function () {
    $f = finalDamageResident();
    $revision = app(DamageReportRevision::class);
    $w = app(DamageReportWorkflow::class);
    $lead = finalDamageTechnician();
    $member = finalDamageTechnician();
    $r = $revision->submit($f['user'], [['description' => 'AC'], ['description' => 'Pintu']]);
    $r = $w->claim($r, $lead);
    expect(fn () => $w->complete($r, $lead, 'Final', ['after/final.jpg'], null, [$member->id]))->toThrow(ValidationException::class);
    expect($r->assignments()->count())->toBe(1);
    foreach ($r->items as $item) {
        $revision->completeItem($item, $lead, 'Baik', []);
    }
    $w->complete($r, $lead, 'Final', ['after/final.jpg'], null, [$member->id]);
    expect($r->assignments()->count())->toBe(2)->and($r->assignments()->whereNull('ended_at')->count())->toBe(0);
});

it('lets a technician record a leader instruction as a standalone dated logbook with private photos', function () {
    Storage::fake('local');
    $t = finalDamageTechnician();
    $data = ['work_date' => today()->toDateString(), 'description' => 'Perbaikan pagar atas instruksi pimpinan', 'source' => 'leader_instruction', 'request_key' => (string) Str::uuid(), 'photos' => [UploadedFile::fake()->image('pagar.jpg')]];
    $this->actingAs($t)->post(route('damage-reports.logbook'), $data)->assertSessionHasNoErrors();
    $this->post(route('damage-reports.logbook'), $data)->assertSessionHasNoErrors();
    $this->assertDatabaseCount('laporan_kerusakan', 0);
    $this->assertDatabaseCount('technician_logbooks', 1);
    $entry = TechnicianLogbook::sole();
    $this->get(route('damage-reports.logbook.photo', $entry->photos->first()))->assertOk();
    $this->get('/pelaporan')->assertInertia(fn (AssertableInertia $p) => $p->has('logbooks.data', 1));
    $other = finalDamageTechnician();
    $this->actingAs($other)->get(route('damage-reports.logbook.photo', $entry->photos->first()))->assertForbidden();
    Role::findOrCreate('pimpinan');
    $leader = User::factory()->create()->assignRole('pimpinan');
    $this->actingAs($leader)->get(route('damage-reports.logbook.photo', $entry->photos->first()))->assertOk();
});

it('rejects a logbook without documentation and unauthorised creation', function () {
    $t = finalDamageTechnician();
    $data = ['work_date' => today()->toDateString(), 'description' => 'Pagar', 'source' => 'other_work', 'request_key' => (string) Str::uuid()];
    $this->actingAs($t)->post(route('damage-reports.logbook'), $data)->assertSessionHasErrors('photos');
    $f = finalDamageResident();
    $this->actingAs($f['user'])->post(route('damage-reports.logbook'), $data)->assertForbidden();
    $this->assertDatabaseCount('technician_logbooks', 0);
});

it('records an idempotent complaint referencing a completed report without reopening it', function () {
    $f = finalDamageResident();
    $revision = app(DamageReportRevision::class);
    $w = app(DamageReportWorkflow::class);
    $t = finalDamageTechnician();
    $r = $revision->submit($f['user'], [['description' => 'AC']]);
    $r = $w->claim($r, $t);
    $w->complete($r, $t, 'Baik', ['after/ac.jpg']);
    $item = $r->items()->sole();
    $key = (string) Str::uuid();
    $revision->complain($r, $f['user'], 'AC kembali tidak dingin', $item->id, $key);
    $revision->complain($r, $f['user'], 'AC kembali tidak dingin', $item->id, $key);
    expect($r->fresh()->status)->toBe(Status::Selesai)->and($r->complaints()->count())->toBe(1);
    $other = finalDamageResident();
    expect(fn () => $revision->complain($r, $other['user'], 'Tidak berhak', null, (string) Str::uuid()))->toThrow(AuthorizationException::class);
});

it('includes status history actor, item photos, and notifications in pelaporan and lapor-kerusakan payloads', function () {
    $f = finalDamageResident();
    $revision = app(DamageReportRevision::class);
    $w = app(DamageReportWorkflow::class);
    $t = finalDamageTechnician();
    $r = $revision->submit($f['user'], [['description' => 'Keran bocor']]);
    $w->claim($r, $t);

    $this->actingAs($f['user'])->get('/pelaporan')->assertOk()->assertInertia(
        fn ($page) => $page
            ->where('reports.data.0.status_histories.0.actor.nama', fn ($name) => is_string($name) && $name !== '')
            ->has('assets')
    );

    $this->actingAs($f['user'])->get('/mahasiswa/lapor-kerusakan')->assertOk()->assertInertia(
        fn ($page) => $page
            ->where('reports.0.status_histories.0.actor.nama', fn ($name) => is_string($name) && $name !== '')
            ->has('reports.0.items.0.photos')
            ->has('notifications')
    );
});

it('shares finalized technician ratings with ticket details on riwayat-penilaian while excluding drafts and other technicians', function () {
    Storage::fake('local');
    $resident = finalDamageResident();
    $technician = finalDamageTechnician();
    $otherTechnician = finalDamageTechnician();

    $createReport = function (string $description) use ($resident): LaporanKerusakan {
        $this->actingAs($resident['user'])->post(route('andalas.laporan.store'), [
            'request_key' => (string) Str::uuid(),
            'items' => [[
                'description' => $description,
                'photos' => [UploadedFile::fake()->image('bukti.jpg')],
            ]],
        ])->assertSessionHasNoErrors();

        return LaporanKerusakan::latest('created_at')->firstOrFail();
    };

    $finalReport = $createReport('Keran bocor');
    $draftReport = $createReport('Lampu redup');
    $otherReport = $createReport('Kunci macet');

    $questionnaire = Kuesioner::create([
        'kode' => 'K-'.Str::random(6),
        'nama' => 'Evaluasi Teknisi',
        'jenis' => 'penilaian_teknisi',
        'versi' => 1,
        'status' => 'aktif',
        'dibuat_oleh' => $resident['user']->id,
    ]);

    PenilaianTeknisi::create([
        'laporan_kerusakan_id' => $finalReport->id,
        'kuesioner_id' => $questionnaire->id,
        'teknisi_id' => $technician->id,
        'dinilai_oleh' => $resident['user']->id,
        'status' => 'final',
        'total_skor' => 4.5,
        'skor_persentase' => 90,
        'catatan_umum' => 'Rapi dan cepat',
        'tanggal_penilaian' => now(),
    ]);

    PenilaianTeknisi::create([
        'laporan_kerusakan_id' => $draftReport->id,
        'kuesioner_id' => $questionnaire->id,
        'teknisi_id' => $technician->id,
        'dinilai_oleh' => $resident['user']->id,
        'status' => 'draft',
        'total_skor' => 2.0,
        'catatan_umum' => 'Belum final',
        'tanggal_penilaian' => now()->subMinute(),
    ]);

    PenilaianTeknisi::create([
        'laporan_kerusakan_id' => $otherReport->id,
        'kuesioner_id' => $questionnaire->id,
        'teknisi_id' => $otherTechnician->id,
        'dinilai_oleh' => $resident['user']->id,
        'status' => 'final',
        'total_skor' => 5.0,
        'catatan_umum' => 'Teknisi lain',
        'tanggal_penilaian' => now(),
    ]);

    $this->actingAs($technician)
        ->get('/teknisi/riwayat-penilaian')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('ratings', 1)
            ->where('ratings.0.laporan_kerusakan.nomor_tiket', $finalReport->nomor_tiket)
            ->where('ratings.0.catatan_umum', 'Rapi dan cepat')
        );
});
