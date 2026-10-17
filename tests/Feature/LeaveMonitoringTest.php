<?php

use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\PengajuanIzinPulang;
use App\Models\Periode;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-17 09:00:00'));
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    Storage::fake('local');
});

function leaveResident(): PenempatanKamar
{
    $user = User::factory()->student()->create(['client_profile_category' => 'local_non_kipk']);
    $user->assignRole('mahasiswa');
    $student = MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => 'IZ-'.$user->id, 'status_huni' => 'aktif', 'angkatan' => '2026']);
    Periode::create(['nama_periode' => '2026/2027', 'status' => 'aktif', 'angkatan_maba' => 2026, 'tanggal_mulai' => now()->startOfYear(), 'tanggal_selesai' => now()->endOfYear()]);
    $building = Gedung::create(['kode_gedung' => fake()->unique()->numerify('IZ-###'), 'nama_gedung' => 'Gedung Izin']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => '101', 'kapasitas' => 2, 'status' => 'terisi_sebagian']);

    return PenempatanKamar::create(['mahasiswa_id' => $student->id, 'kamar_id' => $room->id, 'tanggal_mulai' => today(), 'status' => 'aktif']);
}

function leavePayload(): array
{
    return ['jenis' => 'kegiatan', 'tanggal_mulai' => today()->toDateString(), 'tanggal_kembali' => today()->addDay()->toDateString(), 'alasan' => 'Mengikuti kegiatan kampus', 'tujuan_alamat' => 'Padang'];
}

test('enforces six calendar days per month instead of counting previous applications', function (int $usedDays, bool $allowed) {
    $this->travelTo(Carbon::parse('2026-10-17 09:00:00'));
    $placement = leaveResident();
    if ($usedDays > 0) {
        PengajuanIzinPulang::create([...leavePayload(), 'mahasiswa_id' => $placement->mahasiswa_id, 'tanggal_mulai' => '2026-10-01', 'tanggal_kembali' => '2026-10-'.str_pad((string) $usedDays, 2, '0', STR_PAD_LEFT), 'status' => 'selesai_kembali']);
    }
    $response = $this->actingAs($placement->mahasiswa->user)->post(route('andalas.perizinan.store'), leavePayload());
    if ($allowed) {
        $response->assertRedirect()->assertSessionHasNoErrors();
        $this->assertDatabaseHas('pengajuan_izin_pulang', ['mahasiswa_id' => $placement->mahasiswa_id, 'status' => 'sedang_izin']);
    } else {
        $response->assertSessionHasErrors('tanggal_kembali');
        $this->assertDatabaseCount('pengajuan_izin_pulang', 1);
    }
})->with([[0, true], [4, true], [5, false]]);

test('a pending leave cannot be bypassed by submitting another application', function () {
    $placement = leaveResident();
    PengajuanIzinPulang::create([...leavePayload(), 'mahasiswa_id' => $placement->mahasiswa_id, 'status' => 'diajukan']);
    $this->actingAs($placement->mahasiswa->user)->post(route('andalas.perizinan.store'), leavePayload())->assertSessionHasErrors('jenis');
    $this->assertDatabaseCount('pengajuan_izin_pulang', 1);
});

test('facilitators can only review and list their assigned building', function () {
    $placement = leaveResident();
    $other = leaveResident();
    $facilitator = User::factory()->create();
    $facilitator->assignRole('fasilitator');
    FasilitatorWilayah::create(['user_id' => $facilitator->id, 'gedung_id' => $placement->kamar->lantai->gedung_id]);
    $leave = PengajuanIzinPulang::create([...leavePayload(), 'mahasiswa_id' => $placement->mahasiswa_id, 'gedung_id' => $placement->kamar->lantai->gedung_id, 'status' => 'diajukan']);
    $outside = PengajuanIzinPulang::create([...leavePayload(), 'mahasiswa_id' => $other->mahasiswa_id, 'gedung_id' => $other->kamar->lantai->gedung_id, 'status' => 'diajukan']);
    $this->actingAs($facilitator)->get('/fasilitator/perizinan')->assertInertia(fn (Assert $page) => $page->has('perizinan', 1)->where('perizinan.0.id', $leave->id));
    $this->post(route('andalas.perizinan.review', $outside), ['status' => 'disetujui'])->assertForbidden();
    $this->post(route('andalas.perizinan.review', $leave), ['status' => 'disetujui'])->assertSessionHasNoErrors();
    expect($leave->fresh()->status->value)->toBe('sedang_izin');
    $this->post(route('andalas.perizinan.review', $leave), ['status' => 'ditolak', 'catatan_verifikasi' => 'Ubah keputusan'])->assertSessionHasErrors('status');
    expect($leave->fresh()->status->value)->toBe('sedang_izin');
});

test('student arrival and return require ordered private photo and location evidence', function () {
    $placement = leaveResident();
    $this->actingAs($placement->mahasiswa->user)->post(route('andalas.perizinan.store'), leavePayload())->assertSessionHasNoErrors();
    $leave = PengajuanIzinPulang::firstOrFail();
    $proof = ['foto' => UploadedFile::fake()->image('bukti.jpg'), 'latitude' => -0.91, 'longitude' => 100.45, 'accuracy' => 12];
    $this->post(route('andalas.perizinan.proof', [$leave, 'kembali']), $proof)->assertSessionHasErrors('foto');
    $this->post(route('andalas.perizinan.proof', [$leave, 'sampai']), ['foto' => $proof['foto']])->assertSessionHasErrors(['latitude', 'longitude', 'accuracy']);
    $this->post(route('andalas.perizinan.proof', [$leave, 'sampai']), $proof)->assertSessionHasNoErrors();
    $leave->refresh();
    expect($leave->status->value)->toBe('sudah_sampai');
    expect($leave->sampai_pada)->not->toBeNull();
    Storage::disk('local')->assertExists($leave->sampai_foto_path);
    $this->get(route('andalas.perizinan.evidence', [$leave, 'sampai']))->assertOk();
    $this->post(route('andalas.perizinan.proof', [$leave, 'kembali']), $proof)->assertSessionHasNoErrors();
    expect($leave->fresh()->status->value)->toBe('selesai_kembali');
    expect($leave->fresh()->kembali_pada)->not->toBeNull();
    $this->actingAs(User::factory()->create())->get(route('andalas.perizinan.evidence', [$leave, 'sampai']))->assertForbidden();
});

test('nonresidents cannot submit leave and invalid types are rejected', function () {
    $placement = leaveResident();
    $placement->update(['status' => 'berakhir']);
    $this->actingAs($placement->mahasiswa->user)->post(route('andalas.perizinan.store'), leavePayload())->assertSessionHasErrors('jenis');
    $this->post(route('andalas.perizinan.store'), [...leavePayload(), 'jenis' => 'bebas'])->assertSessionHasErrors('jenis');
    $this->assertDatabaseCount('pengajuan_izin_pulang', 0);
});

test('students and service admins cannot approve leave or access the old approval endpoint', function () {
    $placement = leaveResident();
    $leave = PengajuanIzinPulang::create([...leavePayload(), 'mahasiswa_id' => $placement->mahasiswa_id, 'status' => 'diajukan']);
    $this->actingAs($placement->mahasiswa->user)->post(route('andalas.perizinan.review', $leave), ['status' => 'disetujui'])->assertForbidden();
    $admin = User::factory()->create();
    $admin->assignRole('admin_layanan');
    $this->actingAs($admin)->post(route('andalas.perizinan.review', $leave), ['status' => 'disetujui'])->assertForbidden();
    $this->post('/andalas/pengajuan/izin-pulang/'.$leave->id.'/approve', ['status' => 'disetujui'])->assertNotFound();
});

test('splits leave across months and rejects a seven day span inside one month', function () {
    $this->travelTo(Carbon::parse('2026-10-17 09:00:00'));
    $placement = leaveResident();
    $this->actingAs($placement->mahasiswa->user)->post(route('andalas.perizinan.store'), [...leavePayload(), 'tanggal_mulai' => '2026-10-20', 'tanggal_kembali' => '2026-10-26'])->assertSessionHasErrors('tanggal_kembali');
    $this->assertDatabaseCount('pengajuan_izin_pulang', 0);
    $this->post(route('andalas.perizinan.store'), [...leavePayload(), 'tanggal_mulai' => '2026-10-29', 'tanggal_kembali' => '2026-11-03'])->assertSessionHasNoErrors();
    $this->assertDatabaseCount('pengajuan_izin_pulang', 1);
});

test('does not spend this months leave allowance on rejected sick or previous month records', function () {
    $this->travelTo(Carbon::parse('2026-10-17 09:00:00'));
    $placement = leaveResident();
    foreach ([['kegiatan', 'ditolak', '2026-10-01', '2026-10-06'], ['sakit', 'disetujui', '2026-10-01', '2026-10-06'], ['pulkam', 'selesai_kembali', '2026-09-01', '2026-09-06']] as [$type, $status, $start, $end]) {
        PengajuanIzinPulang::create([...leavePayload(), 'mahasiswa_id' => $placement->mahasiswa_id, 'jenis' => $type, 'status' => $status, 'tanggal_mulai' => $start, 'tanggal_kembali' => $end]);
    }
    $this->actingAs($placement->mahasiswa->user)->post(route('andalas.perizinan.store'), [...leavePayload(), 'tanggal_mulai' => '2026-10-20', 'tanggal_kembali' => '2026-10-25'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('pengajuan_izin_pulang', ['status' => 'sedang_izin']);
});

test('requires private medical evidence and an assigned facilitators approval for sick leave', function () {
    $placement = leaveResident();
    $payload = [...leavePayload(), 'jenis' => 'sakit', 'tujuan_alamat' => null];
    $this->actingAs($placement->mahasiswa->user)->post(route('andalas.perizinan.store'), $payload)->assertSessionHasErrors('dokumen');
    $this->post(route('andalas.perizinan.store'), [...$payload, 'dokumen' => UploadedFile::fake()->create('bukti.pdf', 10, 'application/pdf')])->assertSessionHasNoErrors();
    $leave = PengajuanIzinPulang::sole();
    expect($leave->status->value)->toBe('diajukan')
        ->and($leave->berangkat_pada)->toBeNull();
    Storage::disk('local')->assertExists($leave->dokumen_path);
    $outside = User::factory()->create()->assignRole('fasilitator');
    $this->actingAs($outside)->post(route('andalas.perizinan.review', $leave), ['status' => 'disetujui'])->assertForbidden();
    $reviewer = User::factory()->create()->assignRole('fasilitator');
    FasilitatorWilayah::create(['user_id' => $reviewer->id, 'gedung_id' => $placement->kamar->lantai->gedung_id]);
    $this->actingAs($reviewer)->post(route('andalas.perizinan.review', $leave), ['status' => 'disetujui'])->assertSessionHasNoErrors();
    expect($leave->fresh()->status->value)->toBe('disetujui')
        ->and($leave->fresh()->disetujui_oleh)->toBe($reviewer->id);
    $this->actingAs($placement->mahasiswa->user)->post(route('andalas.perizinan.proof', [$leave, 'sampai']), [])->assertUnprocessable();
});

test('applies the six day limit independently to both calendar months and across years', function (string $start, string $end, bool $allowed) {
    $this->travelTo(Carbon::parse('2026-10-17 09:00:00'));
    $placement = leaveResident();
    $response = $this->actingAs($placement->mahasiswa->user)->post(route('andalas.perizinan.store'), [...leavePayload(), 'tanggal_mulai' => $start, 'tanggal_kembali' => $end]);
    if ($allowed) {
        $response->assertRedirect()->assertSessionHasNoErrors();
        $this->assertDatabaseCount('pengajuan_izin_pulang', 1);
    } else {
        $response->assertSessionHasErrors('tanggal_kembali');
        $this->assertDatabaseCount('pengajuan_izin_pulang', 0);
    }
})->with([
    ['2026-10-26', '2026-11-06', true],
    ['2026-10-31', '2026-11-07', false],
    ['2026-12-26', '2027-01-06', true],
]);

test('counts overlapping historical days once and releases days after an evidenced early return', function () {
    $this->travelTo(Carbon::parse('2026-10-17 09:00:00'));
    $placement = leaveResident();
    foreach ([['2026-10-01', '2026-10-03', null], ['2026-10-02', '2026-10-06', '2026-10-03 15:00:00']] as [$start, $end, $returned]) {
        PengajuanIzinPulang::create([...leavePayload(), 'mahasiswa_id' => $placement->mahasiswa_id, 'tanggal_mulai' => $start, 'tanggal_kembali' => $end, 'status' => 'selesai_kembali', 'kembali_pada' => $returned]);
    }
    $this->actingAs($placement->mahasiswa->user)->post(route('andalas.perizinan.store'), [...leavePayload(), 'tanggal_mulai' => '2026-10-20', 'tanggal_kembali' => '2026-10-22'])->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseCount('pengajuan_izin_pulang', 3);
});
