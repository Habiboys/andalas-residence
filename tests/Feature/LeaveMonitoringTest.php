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
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
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

test('automatic leave approval uses the previous application count boundary', function (int $previous, string $status) {
    $placement = leaveResident();
    for ($i = 0; $i < $previous; $i++) {
        PengajuanIzinPulang::create([...leavePayload(), 'mahasiswa_id' => $placement->mahasiswa_id, 'status' => 'selesai_kembali']);
    }
    $this->actingAs($placement->mahasiswa->user)->post(route('andalas.perizinan.store'), leavePayload())->assertSessionHasNoErrors();
    $this->assertDatabaseHas('pengajuan_izin_pulang', ['mahasiswa_id' => $placement->mahasiswa_id, 'status' => $status, 'jenis' => 'kegiatan', 'gedung_id' => $placement->kamar->lantai->gedung_id]);
})->with([[0, 'sedang_izin'], [6, 'sedang_izin'], [7, 'diajukan']]);

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
