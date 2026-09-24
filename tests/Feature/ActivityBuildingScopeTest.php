<?php

use App\Models\ActivityAttendance;
use App\Models\AttendanceSession;
use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Kegiatan;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
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
    $this->payload = ['judul' => 'Kegiatan A', 'tanggal_mulai' => now()->subHour()->toDateTimeString(), 'tanggal_selesai' => now()->addHour()->toDateTimeString()];
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

it('allows common activities and assigned buildings but refuses other building writes', function () {
    $this->actingAs($this->facilitator)->post(route('andalas.kegiatan.store'), [...$this->payload, 'gedung_id' => $this->building->id])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('kegiatan', ['judul' => 'Kegiatan A', 'gedung_id' => $this->building->id]);
    $this->post(route('andalas.kegiatan.store'), [...$this->payload, 'judul' => 'Umum', 'gedung_id' => null])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('kegiatan', ['judul' => 'Umum', 'gedung_id' => null]);
    $this->post(route('andalas.kegiatan.store'), [...$this->payload, 'gedung_id' => $this->otherBuilding->id])->assertForbidden();
    $this->post(route('andalas.kegiatan.store'), [...$this->payload, 'gedung_id' => fake()->uuid()])->assertSessionHasErrors('gedung_id');
    $activity = Kegiatan::where('judul', 'Kegiatan A')->firstOrFail();
    $this->put(route('andalas.kegiatan.update', $activity), [...$this->payload, 'gedung_id' => $this->otherBuilding->id])->assertForbidden();
    $this->assertDatabaseCount('kegiatan', 2);
});

it('shows common and own building activities and permits a facilitator to open a shared activity', function () {
    $common = Kegiatan::create([...$this->payload, 'judul' => 'Umum', 'dibuat_oleh' => $this->admin->id]);
    $local = Kegiatan::create([...$this->payload, 'gedung_id' => $this->building->id, 'dibuat_oleh' => $this->admin->id]);
    $foreign = Kegiatan::create([...$this->payload, 'judul' => 'Gedung lain', 'gedung_id' => $this->otherBuilding->id, 'dibuat_oleh' => $this->admin->id]);
    $this->actingAs($this->facilitator)->get('/fasilitator/jadwal-kegiatan')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('kegiatan', 2)->has('gedung', 1)->where('gedung.0.id', $this->building->id));
    $this->post(route('andalas.absensi.kegiatan.open', $common), $this->qrPayload)->assertSessionHasNoErrors();
    $this->post(route('andalas.absensi.kegiatan.open', $foreign), $this->qrPayload)->assertForbidden();
    $student = buildingScopeStudent($this->building);
    $this->actingAs($student->user)->get('/mahasiswa/jadwal')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('kegiatan', 2)->where('kegiatan', fn ($rows) => collect($rows)->pluck('id')->sort()->values()->all() === collect([$common->id, $local->id])->sort()->values()->all()));
    $this->actingAs($student->user)->post(route('andalas.kegiatan.store'), $this->payload)->assertForbidden();
});

it('rejects a foreign building scan even inside the radius and accepts its own resident', function () {
    $activity = Kegiatan::create([...$this->payload, 'gedung_id' => $this->building->id, 'dibuat_oleh' => $this->facilitator->id]);
    $this->actingAs($this->facilitator)->post(route('andalas.absensi.kegiatan.open', $activity), $this->qrPayload)->assertSessionHasNoErrors();
    $session = session('attendance_session');
    $scan = ['token' => $session['token'], 'latitude' => -0.9145, 'longitude' => 100.46, 'accuracy_meters' => 5];
    $foreign = buildingScopeStudent($this->otherBuilding);
    $local = buildingScopeStudent($this->building);
    $this->actingAs($foreign->user)->post(route('andalas.absensi.sesi.record', $session['id']), $scan)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('attendance_attempts', ['mahasiswa_id' => $foreign->id, 'rejection_reason' => 'wrong_building']);
    expect(ActivityAttendance::count())->toBe(0);
    $this->actingAs($local->user)->post(route('andalas.absensi.sesi.record', $session['id']), $scan)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('activity_attendances', ['mahasiswa_id' => $local->id, 'attendance_session_id' => $session['id']]);
    $this->actingAs($this->facilitator)->put(route('andalas.kegiatan.update', $activity), [...$this->payload, 'gedung_id' => null])->assertSessionHasErrors('gedung_id');
    expect($activity->fresh()->gedung_id)->toBe($this->building->id);
});

it('accepts residents from different buildings at a common activity', function () {
    $common = Kegiatan::create([...$this->payload, 'dibuat_oleh' => $this->admin->id]);
    $this->actingAs($this->facilitator)->post(route('andalas.absensi.kegiatan.open', $common), $this->qrPayload)->assertSessionHasNoErrors();
    $session = session('attendance_session');
    foreach ([$this->building, $this->otherBuilding] as $building) {
        $student = buildingScopeStudent($building);
        $this->actingAs($student->user)->post(route('andalas.absensi.sesi.record', $session['id']), ['token' => $session['token'], 'latitude' => -0.9145, 'longitude' => 100.46, 'accuracy_meters' => 5])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('activity_attendances', ['mahasiswa_id' => $student->id]);
    }
    expect(AttendanceSession::count())->toBe(1);
});
