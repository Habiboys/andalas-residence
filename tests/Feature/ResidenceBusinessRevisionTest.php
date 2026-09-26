<?php

use App\Actions\Billing\PostPayment;
use App\Actions\Registration\SubmitResidenceRegistration;
use App\Jobs\GenerateFreeResidenceLetter;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\LegacyResidenceRate;
use App\Models\LegacyResident;
use App\Models\MahasiswaProfil;
use App\Models\Pembayaran;
use App\Models\PengajuanBebasAsrama;
use App\Models\Periode;
use App\Models\ResidenceRate;
use App\Models\User;
use App\Services\MasterDataService;
use App\Services\ResidenceLifecycle;
use App\Services\RoomReservations;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Queue;

function revisionStudent(string $nim = '2610000001'): MahasiswaProfil
{
    $user = User::factory()->create(['nim_nip' => $nim, 'client_profile_category' => 'local_non_kipk', 'gender' => 'laki_laki']);
    $user->assignRole('mahasiswa');

    return MahasiswaProfil::create(['user_id' => $user->id, 'angkatan' => '20'.substr($nim, 0, 2), 'barcode_code' => $user->id, 'status_huni' => 'calon']);
}

function revisionRoom(): Kamar
{
    $building = Gedung::create(['kode_gedung' => 'TEST', 'nama_gedung' => 'Gedung Uji', 'gender_peruntukan' => 'campur']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);

    return Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => '101', 'kapasitas' => 1, 'status' => 'kosong', 'tipe_kamar' => 'standar', 'tarif_per_periode' => 2500000]);
}

function revisionPeriod(): Periode
{
    return Periode::create(['nama_periode' => '2026/2027', 'status' => 'aktif', 'angkatan_maba' => 2026, 'tanggal_mulai' => '2026-08-01', 'tanggal_selesai' => '2027-07-31']);
}

it('uses the active admission cohort instead of the calendar year for binaan', function () {
    $this->seed(RolePermissionSeeder::class);
    $this->travelTo(now()->setDate(2027, 2, 1));
    revisionPeriod();
    $student = revisionStudent();
    expect(app(ResidenceLifecycle::class)->isBinaan($student))->toBeTrue();
    $student->residenceHistories()->create(['event' => 'checked_out', 'occurred_at' => now()]);
    expect(app(ResidenceLifecycle::class)->isBinaan($student))->toBeFalse();
});

it('does not classify old cohorts as alumni without a residence archive', function () {
    $this->seed(RolePermissionSeeder::class);
    $student = revisionStudent('2110000001');
    expect(app(ResidenceLifecycle::class)->state($student))->toBe('belum_pernah_tinggal');
    $room = revisionRoom();
    LegacyResident::create(['nim' => $student->user->nim_nip, 'nama' => $student->user->nama, 'angkatan' => 2021, 'gedung_id' => $room->lantai->gedung_id, 'recorded_by' => $student->user_id]);
    expect(app(ResidenceLifecycle::class)->state($student))->toBe('alumni');
});

it('deactivates the previous admission period when another is activated', function () {
    $old = revisionPeriod();
    MasterDataService::createPeriode(['nama_periode' => '2027/2028', 'status' => 'aktif', 'angkatan_maba' => 2027, 'tanggal_mulai' => '2027-08-01', 'tanggal_selesai' => '2028-07-31']);
    expect($old->fresh()->status)->toBe('nonaktif');
    expect(Periode::where('status', 'aktif')->count())->toBe(1);
});

it('reserves the last bed and completes a personal registration after payment', function () {
    $this->seed(RolePermissionSeeder::class);
    Queue::fake();
    $period = revisionPeriod();
    $room = revisionRoom();
    $student = revisionStudent();
    $registration = app(SubmitResidenceRegistration::class)->handle($student, ['periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => $room->id]]]);
    expect(app(RoomReservations::class)->count($room))->toBe(1);
    app(PostPayment::class)->handle('PAY-TEST', $student->id, now()->toDateTimeString(), [['tagihan_id' => $registration->tagihan_id, 'jumlah' => 2500000]]);
    expect($registration->fresh()->completed_at)->not->toBeNull();
    expect($student->fresh()->status_huni)->toBe('aktif');
    expect(app(RoomReservations::class)->count($room))->toBe(0);
});

it('issues the non residence letter automatically for a modern student who never stayed', function () {
    $this->seed(RolePermissionSeeder::class);
    Queue::fake();
    $student = revisionStudent();
    $this->actingAs($student->user)->post(route('andalas.pengajuan.bebas'), ['alasan' => 'Kliring', 'legacy_verification_path' => 'not_alumni'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('pengajuan_bebas_asrama', ['mahasiswa_id' => $student->id, 'document_kind' => 'not_resident', 'status' => 'disetujui']);
    expect($student->user->fresh()->inactive_reason)->toBe('letter_issued');
    Queue::assertPushed(GenerateFreeResidenceLetter::class);
});

it('rejects a second reservation for the last bed and releases it after expiry', function () {
    $this->seed(RolePermissionSeeder::class);
    Queue::fake();
    $this->freezeTime();
    $period = revisionPeriod();
    $room = revisionRoom();
    $student = revisionStudent();
    $other = revisionStudent('2610000002');
    $payload = ['periode_id' => $period->id, 'preferences' => [['kamar_id' => $room->id]]];
    $this->actingAs($student->user)->post(route('andalas.registrations.store'), $payload)->assertSessionHasNoErrors();
    $this->actingAs($other->user)->post(route('andalas.registrations.store'), $payload)->assertSessionHasErrors('preferences');
    $this->travel(25)->hours();
    app(RoomReservations::class)->expire();
    $this->actingAs($other->user)->post(route('andalas.registrations.store'), $payload)->assertSessionHasNoErrors();
    expect(app(RoomReservations::class)->count($room))->toBe(1);
});

it('keeps a reservation while uploaded payment evidence awaits review', function () {
    $this->seed(RolePermissionSeeder::class);
    Queue::fake();
    $this->freezeTime();
    $period = revisionPeriod();
    $room = revisionRoom();
    $student = revisionStudent();
    $registration = app(SubmitResidenceRegistration::class)->handle($student, ['periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => $room->id]]]);
    Pembayaran::create(['kode_transaksi' => 'PROOF-1', 'mahasiswa_id' => $student->id, 'tagihan_id' => $registration->tagihan_id, 'nominal' => 2500000, 'jenis_pembayaran' => 'sewa_asrama', 'status' => 'menunggu_verifikasi']);
    $this->travel(25)->hours();
    app(RoomReservations::class)->expire();
    expect(app(RoomReservations::class)->count($room))->toBe(1);
    expect($registration->fresh()->status->value)->toBe('submitted');
});

it('calculates daily pricing from the selected building room type and dates', function () {
    $this->seed(RolePermissionSeeder::class);
    Queue::fake();
    $this->travelTo(now()->setDate(2026, 9, 25));
    $period = revisionPeriod();
    $room = revisionRoom();
    ResidenceRate::create(['gedung_id' => $room->lantai->gedung_id, 'tipe_kamar' => 'standar', 'unit' => 'day', 'amount' => 150000]);
    $student = revisionStudent();
    $this->actingAs($student->user)->post(route('andalas.registrations.store'), ['periode_id' => $period->id, 'preferences' => [['kamar_id' => $room->id]], 'rate_unit' => 'day', 'starts_at' => '2026-09-26', 'ends_at' => '2026-09-29'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('tagihan', ['mahasiswa_id' => $student->id, 'total' => 450000]);
});

it('ignores a self declared KIPK flag when the recipient roster does not include the student', function () {
    $this->seed(RolePermissionSeeder::class);
    Queue::fake();
    $period = revisionPeriod();
    $student = revisionStudent();
    $this->actingAs($student->user)->post(route('andalas.registrations.store'), ['periode_id' => $period->id, 'is_kipk' => true])->assertSessionHasErrors('preferences');
    $this->assertDatabaseCount('residence_registrations', 0);
});

it('allows sponsored international residence without settling sponsor receivables', function () {
    $this->seed(RolePermissionSeeder::class);
    Queue::fake();
    $period = revisionPeriod();
    $room = revisionRoom();
    $student = revisionStudent();
    $student->user->update(['client_profile_category' => 'international_student']);
    $registration = app(SubmitResidenceRegistration::class)->handle($student, ['periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => $room->id]], 'funding' => 'sponsor', 'sponsor_name' => 'International Office']);
    expect($registration->completed_at)->toBeNull();
    $admin = User::factory()->create();
    $admin->assignRole('admin_layanan');
    $this->actingAs($admin)->post(route('andalas.registrations.sponsor', $registration), ['sponsor_name' => 'International Office'])->assertSessionHasNoErrors();
    expect($registration->fresh()->completed_at)->not->toBeNull();
    expect(app(ResidenceLifecycle::class)->hasDebt($student))->toBeFalse();
    $this->assertDatabaseHas('tagihan', ['id' => $registration->tagihan_id, 'total' => 0, 'sponsor_total' => 2500000, 'sponsor_paid' => 0]);
});

it('uses the historical building cohort tariff and issues a letter once paid', function () {
    $this->seed(RolePermissionSeeder::class);
    Queue::fake();
    $student = revisionStudent('2110000001');
    $room = revisionRoom();
    LegacyResident::create(['nim' => $student->user->nim_nip, 'nama' => $student->user->nama, 'angkatan' => 2021, 'gedung_id' => $room->lantai->gedung_id, 'recorded_by' => $student->user_id]);
    LegacyResidenceRate::create(['angkatan' => 2021, 'gedung_id' => $room->lantai->gedung_id, 'jumlah' => 2100000]);
    $this->actingAs($student->user)->post(route('andalas.pengajuan.bebas'), ['alasan' => 'Kliring', 'legacy_verification_path' => 'alumni_unpaid'])->assertSessionHasNoErrors();
    $application = PengajuanBebasAsrama::where('mahasiswa_id', $student->id)->sole();
    expect((float) $application->tagihan->total)->toBe(2100000.0);
    app(PostPayment::class)->handle('LEGACY-PART', $student->id, now()->toDateTimeString(), [['tagihan_id' => $application->tagihan_id, 'jumlah' => 1000000]]);
    expect($application->fresh()->status->value)->toBe('ditolak');
    app(PostPayment::class)->handle('LEGACY-FINAL', $student->id, now()->toDateTimeString(), [['tagihan_id' => $application->tagihan_id, 'jumlah' => 1100000]]);
    expect($application->fresh()->status->value)->toBe('disetujui');
    expect($application->fresh()->document_snapshot['nama'])->toBe($student->user->nama);
});

it('automatically classifies an archived alumnus without duplicating the historical invoice', function () {
    $this->seed(RolePermissionSeeder::class);
    Queue::fake();
    $student = revisionStudent('2110000001');
    $room = revisionRoom();
    LegacyResident::create(['nim' => $student->user->nim_nip, 'nama' => $student->user->nama, 'angkatan' => 2021, 'gedung_id' => $room->lantai->gedung_id, 'recorded_by' => $student->user_id]);
    LegacyResidenceRate::create(['angkatan' => 2021, 'gedung_id' => $room->lantai->gedung_id, 'jumlah' => 2100000]);
    for ($attempt = 0; $attempt < 2; $attempt++) {
        $this->actingAs($student->user)->post(route('andalas.pengajuan.bebas'), ['alasan' => 'Kliring', 'legacy_verification_path' => 'not_alumni'])->assertSessionHasNoErrors();
    }
    $this->assertDatabaseHas('pengajuan_bebas_asrama', ['mahasiswa_id' => $student->id, 'status' => 'ditolak', 'legacy_verification_path' => 'alumni_unpaid']);
    $this->assertDatabaseCount('tagihan', 1);
});

it('lets a letter inactive account register again but keeps admin blocked accounts out', function () {
    $this->seed(RolePermissionSeeder::class);
    Queue::fake();
    $period = revisionPeriod();
    $room = revisionRoom();
    $student = revisionStudent('2110000001');
    $student->user->update(['status' => 'nonaktif', 'inactive_reason' => 'letter_issued']);
    $this->actingAs($student->user)->post(route('andalas.registrations.store'), ['periode_id' => $period->id, 'preferences' => [['kamar_id' => $room->id]]])->assertSessionHasNoErrors();
    $student->user->update(['inactive_reason' => 'admin_blocked']);
    $this->actingAs($student->user->fresh())->get(route('mahasiswa.dashboard'))->assertForbidden();
});
