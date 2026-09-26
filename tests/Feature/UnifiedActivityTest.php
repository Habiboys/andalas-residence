<?php

use App\Actions\Attendance\OpenAttendanceSession;
use App\Models\ActivityAttendance;
use App\Models\AttendanceSession;
use App\Models\AuditLog;
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
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->withoutVite();
    $this->freezeTime();
    $this->facilitator = User::factory()->create()->assignRole('fasilitator');
    $this->building = Gedung::create(['kode_gedung' => 'UNIFIED', 'nama_gedung' => 'Asrama Uji']);
    FasilitatorWilayah::create(['user_id' => $this->facilitator->id, 'gedung_id' => $this->building->id]);
    Periode::create(['nama_periode' => '2026/2027', 'status' => 'aktif', 'angkatan_maba' => 2026, 'tanggal_mulai' => now()->startOfYear(), 'tanggal_selesai' => now()->endOfYear()]);
    $this->payload = ['jenis_kegiatan_id' => JenisKegiatan::where('nama', 'Sholat Subuh')->value('id'), 'duration_minutes' => 20,
        'radius_meters' => 100, 'latitude' => -0.9145, 'longitude' => 100.46, 'accuracy_meters' => 5];
});

function unifiedResident(Gedung $building, int $level = 1): MahasiswaProfil
{
    $user = User::factory()->student()->create()->assignRole('mahasiswa');
    $profile = MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => fake()->uuid(), 'angkatan' => '2026', 'tanggal_masuk' => now()->subMonth(), 'status_huni' => 'aktif']);
    $floor = Lantai::firstOrCreate(['gedung_id' => $building->id, 'nomor_lantai' => $level], ['nama_lantai' => 'Lantai '.$level]);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => fake()->unique()->numerify('###'), 'kapasitas' => 2, 'status' => 'terisi_sebagian']);
    PenempatanKamar::create(['mahasiswa_id' => $profile->id, 'kamar_id' => $room->id, 'tanggal_mulai' => now()->subMonth(), 'status' => 'aktif']);

    return $profile;
}

it('creates one activity and one recoverable QR with automatic times and floor roster', function () {
    $student = unifiedResident($this->building, 2);
    $this->actingAs($this->facilitator)->post(route('andalas.kegiatan.store'), [...$this->payload, 'judul' => 'Ignored custom title'])->assertSessionHasNoErrors();
    $activity = Kegiatan::firstOrFail();
    $session = AttendanceSession::firstOrFail();
    expect($activity->judul)->toBe('Sholat Subuh')
        ->and($activity->tanggal_mulai->toDateTimeString())->toBe(now()->toDateTimeString())
        ->and($activity->tanggal_selesai->toDateTimeString())->toBe(now()->addMinutes(20)->toDateTimeString())
        ->and($session->expires_at->equalTo($activity->tanggal_selesai))->toBeTrue()
        ->and($session->qr_token)->toHaveLength(64);
    expect($session->getRawOriginal('qr_token'))->not->toBe($session->qr_token);
    $this->getJson(route('andalas.absensi.sesi.show', $session))->assertOk()
        ->assertJsonPath('building', 'Asrama Uji')->assertJsonPath('participants.0.floor', 'Lantai 2')
        ->assertJsonPath('participants.0.id', $student->id)->assertJsonPath('participants.0.is_present', false)
        ->assertJsonPath('qr_code', fn ($value) => str_starts_with($value, 'data:image/svg+xml'));
    expect(fn () => app(OpenAttendanceSession::class)->handle($activity, $this->facilitator, now()->addMinutes(10), -0.9145, 100.46, 100, 50, 5))
        ->toThrow(ValidationException::class);
    $this->assertDatabaseCount('attendance_sessions', 1);
    $this->get('/fasilitator/jadwal-kegiatan')->assertInertia(fn (Assert $page) => $page->missing('kegiatan.0.attendance_session.qr_token')->missing('kegiatan.0.attendance_session.qr_token_hash'));
});

it('requires other names and rejects poor GPS before creating anything', function () {
    $this->actingAs($this->facilitator)->post(route('andalas.kegiatan.store'), [...$this->payload, 'jenis_kegiatan_id' => JenisKegiatan::where('is_other', true)->value('id')])->assertSessionHasErrors('judul');
    $this->post(route('andalas.kegiatan.store'), [...$this->payload, 'accuracy_meters' => 150])->assertSessionHasErrors('accuracy_meters');
    $this->post(route('andalas.kegiatan.store'), [...$this->payload, 'duration_minutes' => 0])->assertSessionHasErrors('duration_minutes');
    $this->assertDatabaseCount('kegiatan', 0);
    $this->assertDatabaseCount('attendance_sessions', 0);
});

it('accepts GPS above fifty meters within the chosen radius and keeps the session accuracy limit', function () {
    $this->actingAs($this->facilitator)->post(route('andalas.kegiatan.store'), [...$this->payload, 'accuracy_meters' => 80])->assertSessionHasNoErrors();
    $session = AttendanceSession::firstOrFail();
    expect((float) $session->maximum_accuracy_meters)->toBe(100.0);
});

it('edits attendance with an audit trail without fabricating a GPS scan', function () {
    $student = unifiedResident($this->building, 2);
    $this->actingAs($this->facilitator)->post(route('andalas.kegiatan.store'), $this->payload)->assertSessionHasNoErrors();
    $session = AttendanceSession::firstOrFail();
    $url = route('andalas.absensi.sesi.correct', [$session, $student]);
    $this->put($url, ['is_present' => true])->assertSessionHasErrors('reason');
    $this->put($url, ['is_present' => true, 'reason' => 'Kamera mahasiswa bermasalah'])->assertSessionHasNoErrors();
    $record = ActivityAttendance::firstOrFail();
    expect($record->is_present)->toBeTrue()->and($record->attendance_attempt_id)->toBeNull()->and($record->corrected_by)->toBe($this->facilitator->id);
    $this->getJson(route('andalas.absensi.sesi.show', $session))->assertJsonPath('participants.0.scanned', false)->assertJsonPath('participants.0.is_present', true);
    $this->put($url, ['is_present' => false, 'reason' => 'Salah memilih peserta saat koreksi'])->assertSessionHasNoErrors();
    expect($record->fresh()->is_present)->toBeFalse();
    expect(AuditLog::where('event', 'attendance.corrected')->count())->toBe(2);
    $this->actingAs($student->user)->put($url, ['is_present' => true, 'reason' => 'Tidak berhak mengoreksi'])->assertForbidden();
});

it('denies foreign facilitators preview correction and session closure', function () {
    $student = unifiedResident($this->building);
    $this->actingAs($this->facilitator)->post(route('andalas.kegiatan.store'), $this->payload)->assertSessionHasNoErrors();
    $session = AttendanceSession::firstOrFail();
    $other = User::factory()->create()->assignRole('fasilitator');
    $this->actingAs($other)->getJson(route('andalas.absensi.sesi.show', $session))->assertForbidden();
    $this->put(route('andalas.absensi.sesi.correct', [$session, $student]), ['is_present' => true, 'reason' => 'Lintas gedung'])->assertForbidden();
    $this->post(route('andalas.absensi.sesi.close', $session))->assertForbidden();
    $this->assertDatabaseCount('activity_attendances', 0);
});

it('shows assigned building and only its room resident and attendance counts on dashboard', function () {
    unifiedResident($this->building);
    $other = Gedung::create(['kode_gedung' => 'OTHER', 'nama_gedung' => 'Asrama Lain']);
    unifiedResident($other);
    $this->actingAs($this->facilitator)->get('/fasilitator/dashboard')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('assigned_building.nama_gedung', 'Asrama Uji')->where('stats.penghuni_aktif', 1)->where('stats.okupansi.total_kamar', 1));
    FasilitatorWilayah::where('user_id', $this->facilitator->id)->delete();
    $this->get('/fasilitator/dashboard')->assertOk()->assertInertia(fn (Assert $page) => $page->where('assigned_building', null)->where('stats.penghuni_aktif', 0)->where('stats.okupansi.total_kamar', 0));
});

it('manages activity types and one assignment per facilitator with several facilitators in a building', function () {
    $admin = User::factory()->create()->assignRole('staff_admin');
    $colleague = User::factory()->create()->assignRole('fasilitator');
    $this->actingAs($admin)->post(route('admin.master-data.jenis-kegiatan.store'), ['nama' => 'Sholat Maghrib'])->assertSessionHasNoErrors();
    $type = JenisKegiatan::where('nama', 'Sholat Maghrib')->firstOrFail();
    $this->put(route('admin.master-data.jenis-kegiatan.update', $type), ['nama' => 'Sholat Isya'])->assertSessionHasNoErrors();
    $this->delete(route('admin.master-data.jenis-kegiatan.destroy', $type))->assertSessionHasNoErrors();
    $this->delete(route('admin.master-data.jenis-kegiatan.destroy', JenisKegiatan::where('is_other', true)->firstOrFail()))->assertSessionHasErrors('nama');
    $this->post(route('admin.master-data.penugasan.store'), ['user_id' => $colleague->id, 'gedung_id' => $this->building->id])->assertSessionHasNoErrors();
    $this->post(route('admin.master-data.penugasan.store'), ['user_id' => $colleague->id, 'gedung_id' => $this->building->id])->assertSessionHasNoErrors();
    expect(FasilitatorWilayah::where('user_id', $colleague->id)->count())->toBe(1);
    expect(FasilitatorWilayah::where('gedung_id', $this->building->id)->count())->toBe(2);
    $this->actingAs($colleague)->post(route('admin.master-data.jenis-kegiatan.store'), ['nama' => 'Tidak boleh'])->assertForbidden();
});

it('closes active QR when an administrator changes its facilitator assignment', function () {
    $this->actingAs($this->facilitator)->post(route('andalas.kegiatan.store'), $this->payload)->assertSessionHasNoErrors();
    $session = AttendanceSession::firstOrFail();
    $admin = User::factory()->create()->assignRole('staff_admin');
    $building = Gedung::create(['kode_gedung' => 'NEW', 'nama_gedung' => 'Gedung Baru']);
    $this->actingAs($admin)->post(route('admin.master-data.penugasan.store'), ['user_id' => $this->facilitator->id, 'gedung_id' => $building->id])->assertSessionHasNoErrors();
    expect($session->fresh()->closed_at)->not->toBeNull();
    $this->actingAs($this->facilitator)->getJson(route('andalas.absensi.sesi.show', $session))->assertForbidden();
});
