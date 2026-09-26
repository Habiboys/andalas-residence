<?php

use App\Actions\Billing\PostPayment;
use App\Actions\Checkout\CompleteCheckout;
use App\Actions\Checkout\CreateCheckoutRequest;
use App\Enums\FreeResidenceLetterStatus;
use App\Enums\LegacyFreeResidenceVerificationPath;
use App\Enums\RoomInspectionStatus;
use App\Enums\TagihanStatus;
use App\Jobs\GenerateFreeResidenceLetter;
use App\Models\CheckoutRequest;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\LegacyResidenceRate;
use App\Models\LegacyResident;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\PengajuanBebasAsrama;
use App\Models\Tagihan;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

function freeResidenceLetterFixture(): array
{
    Queue::fake([GenerateFreeResidenceLetter::class]);
    $studentUser = User::factory()->create(['client_profile_category' => 'local_non_kipk']);
    $studentUser->assignRole('mahasiswa');
    $approver = User::factory()->create()->assignRole('admin_layanan');
    $student = MahasiswaProfil::create([
        'user_id' => $studentUser->id,
        'barcode_code' => 'BA-'.$studentUser->id,
        'status_huni' => 'aktif',
    ]);
    $building = Gedung::create(['kode_gedung' => 'BA-'.fake()->unique()->numerify('###'), 'nama_gedung' => 'Gedung Bebas Asrama']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => fake()->unique()->numerify('BA-###'), 'kapasitas' => 1, 'status' => 'penuh', 'tipe_kamar' => 'standar', 'tarif_per_periode' => 2100000]);

    return compact('student', 'studentUser', 'approver', 'building', 'room');
}

function legacyLetterFixture(string $nim = '2110000001'): array
{
    $fixture = freeResidenceLetterFixture();
    $fixture['studentUser']->update(['nim_nip' => $nim]);
    $fixture['student']->update(['angkatan' => '2021', 'status_huni' => 'keluar']);
    LegacyResident::create([
        'nim' => $nim,
        'nama' => $fixture['studentUser']->nama,
        'angkatan' => 2021,
        'gedung_id' => $fixture['building']->id,
        'recorded_by' => $fixture['approver']->id,
    ]);
    LegacyResidenceRate::create(['angkatan' => 2021, 'gedung_id' => $fixture['building']->id, 'jumlah' => 2100000]);

    return $fixture;
}

function checkoutFreeResidenceStudent(array $fixture): void
{
    $fixture['student']->update(['angkatan' => '2026']);
    PenempatanKamar::create([
        'mahasiswa_id' => $fixture['student']->id,
        'kamar_id' => $fixture['room']->id,
        'tanggal_mulai' => now()->toDateString(),
        'status' => 'aktif',
    ]);
    $checkout = (new CreateCheckoutRequest)->handle($fixture['student']->fresh());
    $checkout->inspection->update(['status' => RoomInspectionStatus::Selesai]);
    (new CompleteCheckout)->handle($checkout);
}

it('invoices an unpaid legacy alumnus at the cohort rate and issues the letter after payment', function () {
    $this->seed(RolePermissionSeeder::class);
    $fixture = legacyLetterFixture();

    $this->actingAs($fixture['studentUser'])->post(route('andalas.pengajuan.bebas'), [
        'alasan' => 'Kliring',
    ])->assertSessionHasNoErrors();

    $application = PengajuanBebasAsrama::sole();
    expect($application->status)->toBe(FreeResidenceLetterStatus::Ditolak)
        ->and($application->catatan_penolakan)->toContain('terdata sebagai alumni asrama')
        ->and((float) $application->tagihan->total)->toBe(2100000.0)
        ->and($fixture['studentUser']->fresh()->status)->toBe('aktif');
    Queue::assertNotPushed(GenerateFreeResidenceLetter::class);

    app(PostPayment::class)->handle('LEGACY-PAY', $fixture['student']->id, now()->toDateTimeString(), [
        ['tagihan_id' => $application->tagihan_id, 'jumlah' => 2100000],
    ]);

    expect($application->fresh()->status)->toBe(FreeResidenceLetterStatus::Disetujui)
        ->and($fixture['studentUser']->fresh()->status)->toBe('nonaktif')
        ->and($fixture['studentUser']->fresh()->inactive_reason)->toBe('letter_issued')
        ->and($application->fresh()->document_snapshot['nama'])->toBe($fixture['studentUser']->nama);
    Queue::assertPushed(GenerateFreeResidenceLetter::class);
});

it('refuses to invoice a legacy alumnus until the building cohort tariff exists', function () {
    $this->seed(RolePermissionSeeder::class);
    $fixture = freeResidenceLetterFixture();
    $fixture['studentUser']->update(['nim_nip' => '2110000009']);
    $fixture['student']->update(['angkatan' => '2021', 'status_huni' => 'keluar']);
    LegacyResident::create([
        'nim' => '2110000009', 'nama' => $fixture['studentUser']->nama, 'angkatan' => 2021,
        'gedung_id' => $fixture['building']->id, 'recorded_by' => $fixture['approver']->id,
    ]);

    $this->actingAs($fixture['studentUser'])->post(route('andalas.pengajuan.bebas'), [
        'alasan' => 'Kliring', 'legacy_verification_path' => 'alumni_unpaid',
    ])->assertSessionHasErrors('legacy');

    $this->assertDatabaseCount('pengajuan_bebas_asrama', 0);
    Queue::assertNothingPushed();
});

it('settles a paid legacy claim and issues the letter after administrator verification', function () {
    $this->seed(RolePermissionSeeder::class);
    Storage::fake('local');
    $fixture = legacyLetterFixture();

    $this->actingAs($fixture['studentUser'])->post(route('andalas.pengajuan.bebas'), [
        'alasan' => 'Sudah lunas',
        'payment_evidence' => UploadedFile::fake()->create('bayar.pdf', 10, 'application/pdf'),
        'bank_statement' => UploadedFile::fake()->create('rekening.pdf', 10, 'application/pdf'),
    ])->assertSessionHasNoErrors();

    $application = PengajuanBebasAsrama::sole();
    expect($application->status)->toBe(FreeResidenceLetterStatus::Diajukan)
        ->and($application->tagihan_id)->toBeNull();

    $this->actingAs($fixture['approver'])->post(route('andalas.pengajuan.bebas.approve', $application), ['status' => 'disetujui'])
        ->assertSessionHasNoErrors();

    expect($application->fresh()->status)->toBe(FreeResidenceLetterStatus::Disetujui)
        ->and($application->fresh()->tagihan->status)->toBe(TagihanStatus::Lunas)
        ->and((float) $application->fresh()->tagihan->total_dibayar)->toBe(2100000.0)
        ->and($fixture['studentUser']->fresh()->inactive_reason)->toBe('letter_issued');
    Queue::assertPushed(GenerateFreeResidenceLetter::class);
});

it('requires payment evidence and a bank statement for a paid legacy claim', function () {
    $this->seed(RolePermissionSeeder::class);
    $fixture = legacyLetterFixture();

    $this->actingAs($fixture['studentUser'])->post(route('andalas.pengajuan.bebas'), [
        'alasan' => 'Sudah lunas',
        'bank_statement' => UploadedFile::fake()->create('rekening.pdf', 10, 'application/pdf'),
    ])->assertSessionHasErrors('payment_evidence');

    $this->assertDatabaseCount('pengajuan_bebas_asrama', 0);
});

it('ignores a submitted nonresident classification and uses the alumnus archive to create the invoice', function () {
    $this->seed(RolePermissionSeeder::class);
    $fixture = legacyLetterFixture();

    $this->actingAs($fixture['studentUser'])->post(route('andalas.pengajuan.bebas'), [
        'alasan' => 'Tidak pernah tinggal', 'legacy_verification_path' => 'not_alumni',
    ])->assertSessionHasNoErrors();

    $application = PengajuanBebasAsrama::sole();
    expect($application->status)->toBe(FreeResidenceLetterStatus::Ditolak)
        ->and($application->catatan_penolakan)->toContain('terdata sebagai alumni asrama')
        ->and($application->legacy_verification_path)->toBe(LegacyFreeResidenceVerificationPath::AlumniUnpaid)
        ->and($application->document_kind)->toBe('free_residence')
        ->and($application->tagihan_id)->not->toBeNull();
    $this->assertDatabaseCount('tagihan', 1);
    Queue::assertNotPushed(GenerateFreeResidenceLetter::class);
});

it('uses completed checkout even if a client submits a nonresident classification', function () {
    $this->seed(RolePermissionSeeder::class);
    $fixture = freeResidenceLetterFixture();
    checkoutFreeResidenceStudent($fixture);

    $this->actingAs($fixture['studentUser'])->post(route('andalas.pengajuan.bebas'), [
        'alasan' => 'Tidak pernah tinggal', 'legacy_verification_path' => 'not_alumni',
    ])->assertSessionHasNoErrors();

    expect(PengajuanBebasAsrama::sole()->status)->toBe(FreeResidenceLetterStatus::Disetujui)
        ->and(PengajuanBebasAsrama::sole()->document_kind)->toBe('free_residence');
    $this->assertDatabaseCount('tagihan', 0);
    Queue::assertPushed(GenerateFreeResidenceLetter::class);
});

it('automatically issues a former residents letter after checkout and settling personal debt', function () {
    $this->seed(RolePermissionSeeder::class);
    $fixture = freeResidenceLetterFixture();
    checkoutFreeResidenceStudent($fixture);

    $checkout = CheckoutRequest::where('mahasiswa_id', $fixture['student']->id)->sole();
    $this->actingAs($fixture['studentUser'])->post(route('andalas.pengajuan.bebas'), [
        'alasan' => 'Administrasi',
    ])->assertSessionHasNoErrors();

    $application = PengajuanBebasAsrama::sole();
    expect($application->status)->toBe(FreeResidenceLetterStatus::Disetujui)
        ->and($application->checkout_request_id)->toBe($checkout->id)
        ->and($application->document_kind)->toBe('free_residence');
    Queue::assertPushed(GenerateFreeResidenceLetter::class);
});

it('refuses a former residents letter while a personal invoice is unpaid without leaving a partial application', function () {
    $this->seed(RolePermissionSeeder::class);
    $fixture = freeResidenceLetterFixture();
    checkoutFreeResidenceStudent($fixture);
    Tagihan::create(['nomor' => 'UNPAID-X', 'mahasiswa_id' => $fixture['student']->id, 'total' => 100000, 'status' => 'terbit']);

    $this->actingAs($fixture['studentUser'])->post(route('andalas.pengajuan.bebas'), [
        'alasan' => 'Surat', 'legacy_verification_path' => 'alumni_unpaid',
    ])->assertSessionHasErrors('status');

    $this->assertDatabaseCount('pengajuan_bebas_asrama', 0);
    Queue::assertNothingPushed();
});

it('restricts legacy verification decisions to service administrators', function () {
    $this->seed(RolePermissionSeeder::class);
    $fixture = legacyLetterFixture();
    $application = PengajuanBebasAsrama::create([
        'mahasiswa_id' => $fixture['student']->id, 'nomor_pengajuan' => 'CLASSIFY-UNPAID',
        'alasan' => 'Surat', 'status' => FreeResidenceLetterStatus::Diajukan, 'lifecycle_year' => 2021,
        'legacy_verification_path' => LegacyFreeResidenceVerificationPath::AlumniUnpaid,
    ]);
    $facilitator = User::factory()->create()->assignRole('fasilitator');

    $this->actingAs($facilitator)->post(route('andalas.pengajuan.bebas.approve', $application), ['status' => 'disetujui'])
        ->assertForbidden();

    $this->actingAs($fixture['approver'])->post(route('andalas.pengajuan.bebas.approve', $application), ['status' => 'disetujui'])
        ->assertSessionHasNoErrors();

    expect($application->fresh()->status)->toBe(FreeResidenceLetterStatus::Diverifikasi)
        ->and((float) $application->fresh()->tagihan->total)->toBe(2100000.0);
    Queue::assertNotPushed(GenerateFreeResidenceLetter::class);
});

it('automatically issues a nonresident letter without a classification field', function () {
    $this->seed(RolePermissionSeeder::class);
    $fixture = freeResidenceLetterFixture();
    $fixture['student']->update(['angkatan' => 2025, 'status_huni' => 'calon']);

    $this->actingAs($fixture['studentUser'])->post(route('andalas.pengajuan.bebas'), ['alasan' => 'Administrasi'])
        ->assertSessionHasNoErrors();

    expect(PengajuanBebasAsrama::sole()->document_kind)->toBe('not_resident')
        ->and(PengajuanBebasAsrama::sole()->status)->toBe(FreeResidenceLetterStatus::Disetujui);
    Queue::assertPushed(GenerateFreeResidenceLetter::class);
});

it('allows historical evidence after invoicing without duplicating or automatically settling the invoice', function () {
    $this->seed(RolePermissionSeeder::class);
    Storage::fake('local');
    $fixture = legacyLetterFixture();
    $this->actingAs($fixture['studentUser'])->post(route('andalas.pengajuan.bebas'), ['alasan' => 'Administrasi'])
        ->assertSessionHasNoErrors();
    $invoiceId = PengajuanBebasAsrama::sole()->tagihan_id;
    $this->post(route('andalas.pengajuan.bebas'), [
        'alasan' => 'Pembayaran lama',
        'payment_evidence' => UploadedFile::fake()->create('bayar.pdf', 10, 'application/pdf'),
        'bank_statement' => UploadedFile::fake()->create('rekening.pdf', 10, 'application/pdf'),
    ])->assertSessionHasNoErrors();
    $this->post(route('andalas.pengajuan.bebas'), ['alasan' => 'Dikirim ulang'])->assertSessionHasNoErrors();

    expect(PengajuanBebasAsrama::sole()->status)->toBe(FreeResidenceLetterStatus::Diajukan)
        ->and(PengajuanBebasAsrama::sole()->legacy_verification_path)->toBe(LegacyFreeResidenceVerificationPath::AlumniPaid)
        ->and(PengajuanBebasAsrama::sole()->tagihan_id)->toBe($invoiceId)
        ->and((float) Tagihan::findOrFail($invoiceId)->total_dibayar)->toBe(0.0);
    $this->assertDatabaseCount('tagihan', 1);
    Queue::assertNotPushed(GenerateFreeResidenceLetter::class);
});

it('sends unrecorded historical payment evidence to admin instead of issuing a nonresident letter', function () {
    $this->seed(RolePermissionSeeder::class);
    Storage::fake('local');
    $fixture = freeResidenceLetterFixture();
    $fixture['student']->update(['angkatan' => 2021, 'status_huni' => 'calon']);
    $this->actingAs($fixture['studentUser'])->post(route('andalas.pengajuan.bebas'), [
        'alasan' => 'Pembayaran lama',
        'payment_evidence' => UploadedFile::fake()->create('bayar.pdf', 10, 'application/pdf'),
        'bank_statement' => UploadedFile::fake()->create('rekening.pdf', 10, 'application/pdf'),
    ])->assertSessionHasNoErrors();

    expect(PengajuanBebasAsrama::sole()->status)->toBe(FreeResidenceLetterStatus::Diajukan)
        ->and(PengajuanBebasAsrama::sole()->document_kind)->toBe('free_residence');
    Queue::assertNotPushed(GenerateFreeResidenceLetter::class);
});
