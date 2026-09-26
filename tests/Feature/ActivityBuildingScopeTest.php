<?php

use App\Models\AttendanceSession;
use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\JenisKegiatan;
use App\Models\Kamar;
use App\Models\Kegiatan;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\Periode;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->withoutVite();
    $this->freezeTime();
    $this->facilitator = User::factory()->create()->assignRole('fasilitator');
    $this->admin = User::factory()->create()->assignRole('admin_layanan');
    $this->building = Gedung::create(['kode_gedung' => 'SCOPE-A', 'nama_gedung' => 'Asrama A']);
    $this->otherBuilding = Gedung::create(['kode_gedung' => 'SCOPE-B', 'nama_gedung' => 'Asrama B']);
    FasilitatorWilayah::create(['user_id' => $this->facilitator->id, 'gedung_id' => $this->building->id]);
    Periode::create(['nama_periode' => '2026/2027', 'status' => 'aktif', 'angkatan_maba' => 2026, 'tanggal_mulai' => now()->startOfYear(), 'tanggal_selesai' => now()->endOfYear()]);
    $this->payload = ['jenis_kegiatan_id' => JenisKegiatan::where('is_other', true)->value('id'), 'judul' => 'Kegiatan A', 'duration_minutes' => 15, 'latitude' => -0.9145, 'longitude' => 100.46, 'accuracy_meters' => 5, 'radius_meters' => 100];
    $this->qrPayload = ['expires_at' => now()->addMinutes(10)->toDateTimeString(), 'latitude' => -0.9145, 'longitude' => 100.46, 'accuracy_meters' => 5, 'radius_meters' => 100, 'maximum_accuracy_meters' => 30];
});

function buildingScopeStudent(Gedung $building): MahasiswaProfil
{
    $user = User::factory()->student()->create()->assignRole('mahasiswa');
    $student = MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => fake()->uuid(), 'angkatan' => '2026', 'tanggal_masuk' => now()->subMonth(), 'status_huni' => 'aktif']);
    $floor = Lantai::firstOrCreate(['gedung_id' => $building->id, 'nomor_lantai' => 1], ['nama_lantai' => 'Lantai 1']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => fake()->unique()->numerify('###'), 'kapasitas' => 2, 'status' => 'terisi_sebagian']);
    PenempatanKamar::create(['mahasiswa_id' => $student->id, 'kamar_id' => $room->id, 'tanggal_mulai' => now()->subMonth(), 'status' => 'aktif']);

    return $student;
}

it('derives the assigned building and refuses foreign building writes', function () {
    $this->actingAs($this->facilitator)->post(route('andalas.kegiatan.store'), $this->payload)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('kegiatan', ['judul' => 'Kegiatan A', 'gedung_id' => $this->building->id]);
    $this->post(route('andalas.kegiatan.store'), [...$this->payload, 'gedung_id' => $this->otherBuilding->id])->assertForbidden();
    $this->post(route('andalas.kegiatan.store'), [...$this->payload, 'gedung_id' => fake()->uuid()])->assertSessionHasErrors('gedung_id');
    $activity = Kegiatan::firstOrFail();
    $this->put(route('andalas.kegiatan.update', $activity), ['gedung_id' => $this->otherBuilding->id])->assertSessionHasErrors('gedung_id');
    $this->assertDatabaseCount('kegiatan', 1);
});

it('shows only assigned building activities and lets colleagues view the same roster', function () {
    $this->actingAs($this->facilitator)->post(route('andalas.kegiatan.store'), $this->payload)->assertSessionHasNoErrors();
    $activity = Kegiatan::firstOrFail();
    $foreign = Kegiatan::create(['judul' => 'Other', 'gedung_id' => $this->otherBuilding->id, 'dibuat_oleh' => $this->admin->id, 'tanggal_mulai' => now(), 'tanggal_selesai' => now()->addHour()]);
    $colleague = User::factory()->create()->assignRole('fasilitator');
    FasilitatorWilayah::create(['user_id' => $colleague->id, 'gedung_id' => $this->building->id]);
    $this->actingAs($colleague)->get('/fasilitator/jadwal-kegiatan')->assertOk()->assertInertia(fn (Assert $page) => $page->has('kegiatan', 1)->where('assigned_building.id', $this->building->id));
    $this->getJson(route('andalas.absensi.sesi.show', AttendanceSession::firstOrFail()))->assertOk()->assertJsonPath('is_owner', false)->assertJsonPath('qr_code', null);
    $student = buildingScopeStudent($this->building);
    $this->actingAs($student->user)->get('/mahasiswa/jadwal')->assertOk()->assertInertia(fn (Assert $page) => $page->has('kegiatan', 1)->where('kegiatan.0.id', $activity->id));
    $this->post(route('andalas.kegiatan.store'), $this->payload)->assertForbidden();
});

it('rejects a foreign building scan and records an eligible participant from the snapshot', function () {
    $foreign = buildingScopeStudent($this->otherBuilding);
    $local = buildingScopeStudent($this->building);
    $this->actingAs($this->facilitator)->post(route('andalas.kegiatan.store'), $this->payload)->assertSessionHasNoErrors();
    $session = AttendanceSession::firstOrFail();
    $scan = ['token' => $session->qr_token, 'latitude' => -0.9145, 'longitude' => 100.46, 'accuracy_meters' => 5];
    $this->actingAs($foreign->user)->post(route('andalas.absensi.sesi.record', $session), $scan)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('attendance_attempts', ['mahasiswa_id' => $foreign->id, 'rejection_reason' => 'wrong_building']);
    $this->assertDatabaseCount('activity_attendances', 0);
    $this->actingAs($local->user)->post(route('andalas.absensi.sesi.record', $session), $scan)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('activity_attendances', ['mahasiswa_id' => $local->id]);
});

it('requires each facilitator to have a building and prevents common activities', function () {
    FasilitatorWilayah::where('user_id', $this->facilitator->id)->delete();
    $this->actingAs($this->facilitator)->post(route('andalas.kegiatan.store'), $this->payload)->assertSessionHasErrors('gedung_id');
    $this->assertDatabaseCount('attendance_sessions', 0);
    $this->actingAs($this->admin)->post(route('andalas.kegiatan.store'), $this->payload)->assertForbidden();
});
