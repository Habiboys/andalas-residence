<?php

use App\Actions\ApproveFreeResidenceLetter;
use App\Actions\Billing\PostPayment;
use App\Actions\Checkout\CompleteCheckout;
use App\Actions\Checkout\CreateCheckoutRequest;
use App\Enums\CheckoutRequestStatus;
use App\Enums\FreeResidenceLetterStatus;
use App\Enums\LegacyFreeResidenceVerificationPath;
use App\Enums\RoomInspectionStatus;
use App\Enums\TagihanStatus;
use App\Jobs\GenerateFreeResidenceLetter;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\PengajuanBebasAsrama;
use App\Models\Tagihan;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;

function freeResidenceLetterFixture(): array
{
    Queue::fake([GenerateFreeResidenceLetter::class]);
    $studentUser = User::factory()->create();
    $approver = User::factory()->create();
    $student = MahasiswaProfil::create([
        'user_id' => $studentUser->id,
        'barcode_code' => 'BA-'.$studentUser->id,
        'status_huni' => 'aktif',
    ]);

    return compact('student', 'approver');
}

function placeFreeResidenceStudent(MahasiswaProfil $student): void
{
    $building = Gedung::create(['kode_gedung' => 'BA-'.fake()->unique()->numerify('###'), 'nama_gedung' => 'Gedung Bebas Asrama']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => fake()->unique()->numerify('BA-###'), 'kapasitas' => 1, 'status' => 'penuh']);
    PenempatanKamar::create([
        'mahasiswa_id' => $student->id,
        'kamar_id' => $room->id,
        'tanggal_mulai' => now()->toDateString(),
        'status' => 'aktif',
    ]);
}

it('approves each legacy 2025 verification path', function (LegacyFreeResidenceVerificationPath $path) {
    $fixture = freeResidenceLetterFixture();
    $application = PengajuanBebasAsrama::create([
        'nomor_pengajuan' => 'BA-2025-'.fake()->unique()->numerify('###'),
        'mahasiswa_id' => $fixture['student']->id,
        'alasan' => 'Legacy',
        'status' => FreeResidenceLetterStatus::Diverifikasi,
        'lifecycle_year' => 2025,
        'legacy_verification_path' => $path,
        'bank_statement_path' => $path === LegacyFreeResidenceVerificationPath::AlumniPaid ? 'private/evidence/bank.pdf' : null,
        'payment_evidence_path' => $path === LegacyFreeResidenceVerificationPath::AlumniPaid ? 'private/evidence/payment.pdf' : null,
    ]);

    if ($path === LegacyFreeResidenceVerificationPath::AlumniUnpaid) {
        $invoice = Tagihan::create(['nomor' => 'LEGACY-PAID', 'mahasiswa_id' => $fixture['student']->id, 'total' => 1000000, 'total_dibayar' => 1000000, 'status' => TagihanStatus::Lunas]);
        $application->update(['tagihan_id' => $invoice->id]);
    }

    $approved = (new ApproveFreeResidenceLetter)->handle($application, $fixture['approver']);
    $repeated = (new ApproveFreeResidenceLetter)->handle($approved, $fixture['approver']);

    expect($approved->status)->toBe(FreeResidenceLetterStatus::Disetujui)
        ->and($repeated->id)->toBe($approved->id);
    $this->assertDatabaseCount('free_residence_letter_document_intents', 1);
    $this->assertDatabaseCount('pengajuan_bebas_asrama_status_histories', 1);
})->with(LegacyFreeResidenceVerificationPath::cases());

it('approves a 2026 application only after checkout and settling invoices', function () {
    $fixture = freeResidenceLetterFixture();
    placeFreeResidenceStudent($fixture['student']);
    $checkout = (new CreateCheckoutRequest)->handle($fixture['student']);
    $checkout->update(['status' => CheckoutRequestStatus::Selesai, 'selesai_at' => now()]);
    $checkout->placement->update(['status' => 'berakhir']);
    $application = PengajuanBebasAsrama::create([
        'nomor_pengajuan' => 'BA-2026-001',
        'mahasiswa_id' => $fixture['student']->id,
        'alasan' => 'Modern',
        'status' => FreeResidenceLetterStatus::Diverifikasi,
        'lifecycle_year' => 2026,
        'checkout_request_id' => $checkout->id,
    ]);

    $approved = (new ApproveFreeResidenceLetter)->handle($application, $fixture['approver']);

    expect($approved->status)->toBe(FreeResidenceLetterStatus::Disetujui);
    $this->assertDatabaseHas('free_residence_letter_document_intents', ['pengajuan_id' => $application->id, 'status' => 'pending']);
});

it('rejects illegal 2026 approval atomically', function () {
    $fixture = freeResidenceLetterFixture();
    placeFreeResidenceStudent($fixture['student']);
    $checkout = (new CreateCheckoutRequest)->handle($fixture['student']);
    $application = PengajuanBebasAsrama::create([
        'nomor_pengajuan' => 'BA-2026-002',
        'mahasiswa_id' => $fixture['student']->id,
        'alasan' => 'Belum selesai checkout',
        'status' => FreeResidenceLetterStatus::Diverifikasi,
        'lifecycle_year' => 2026,
        'checkout_request_id' => $checkout->id,
    ]);

    expect(fn () => (new ApproveFreeResidenceLetter)->handle($application, $fixture['approver']))
        ->toThrow(ValidationException::class);

    $this->assertDatabaseHas('pengajuan_bebas_asrama', ['id' => $application->id, 'status' => 'diverifikasi']);
    $this->assertDatabaseCount('pengajuan_bebas_asrama_status_histories', 0);
    $this->assertDatabaseCount('free_residence_letter_document_intents', 0);
});

it('automatically approves a modern application from the students completed checkout', function () {
    $fixture = freeResidenceLetterFixture();
    $student = $fixture['student'];
    $student->update(['angkatan' => '2026']);
    placeFreeResidenceStudent($student);
    $checkout = (new CreateCheckoutRequest)->handle($student);
    $checkout->inspection->update(['status' => RoomInspectionStatus::Selesai]);
    (new CompleteCheckout)->handle($checkout);
    $student->user->givePermissionTo(Permission::findOrCreate('pengajuan.submit'));

    $this->actingAs($student->user)->post(route('andalas.pengajuan.bebas'), ['alasan' => 'Syarat administrasi'])
        ->assertSessionHasNoErrors();

    $application = PengajuanBebasAsrama::sole();
    expect($application->status)->toBe(FreeResidenceLetterStatus::Disetujui)
        ->and($application->checkout_request_id)->toBe($checkout->id)
        ->and($application->disetujui_oleh)->toBeNull();
    Queue::assertPushed(GenerateFreeResidenceLetter::class);
});

it('refuses a modern letter with outstanding debt without leaving a partial application', function () {
    $fixture = freeResidenceLetterFixture();
    $student = $fixture['student'];
    $student->update(['angkatan' => '2026']);
    placeFreeResidenceStudent($student);
    $checkout = (new CreateCheckoutRequest)->handle($student);
    $checkout->inspection->update(['status' => RoomInspectionStatus::Selesai]);
    (new CompleteCheckout)->handle($checkout);
    Tagihan::create(['nomor' => 'UNPAID', 'mahasiswa_id' => $student->id, 'total' => 100000, 'status' => 'terbit']);
    $student->user->givePermissionTo(Permission::findOrCreate('pengajuan.submit'));

    $this->actingAs($student->user)->post(route('andalas.pengajuan.bebas'), ['alasan' => 'Surat'])
        ->assertSessionHasErrors('checkout_request_id');

    $this->assertDatabaseCount('pengajuan_bebas_asrama', 0);
    Queue::assertNothingPushed();
});

it('invoices an unpaid legacy alumnus at the cohort rate and issues the letter after payment', function () {
    $fixture = freeResidenceLetterFixture();
    $student = $fixture['student'];
    $student->update(['angkatan' => '2024', 'status_huni' => 'keluar']);
    $application = PengajuanBebasAsrama::create(['nomor_pengajuan' => 'BA-LEGACY-HTTP', 'mahasiswa_id' => $student->id, 'alasan' => 'Surat', 'lifecycle_year' => 2024, 'status' => FreeResidenceLetterStatus::Diajukan]);
    $admin = $fixture['approver'];
    $admin->givePermissionTo(Permission::findOrCreate('free-residence.review'));

    $this->actingAs($admin)->post(route('andalas.pengajuan.bebas.approve', $application), [
        'status' => 'disetujui', 'legacy_verification_path' => 'alumni_unpaid', 'jumlah_tagihan_angkatan' => 800000,
    ])->assertSessionHasNoErrors();
    $application->refresh();
    expect($application->status)->toBe(FreeResidenceLetterStatus::Diverifikasi)->and($application->tagihan->total)->toBe('800000.00');
    Queue::assertNotPushed(GenerateFreeResidenceLetter::class);

    app(PostPayment::class)->handle('LEGACY-PAY', $student->id, now()->toDateTimeString(), [['tagihan_id' => $application->tagihan_id, 'jumlah' => 800000]]);

    expect($application->fresh()->status)->toBe(FreeResidenceLetterStatus::Disetujui);
    $this->assertDatabaseHas('legacy_residence_rates', ['angkatan' => 2024, 'jumlah' => 800000]);
    Queue::assertPushed(GenerateFreeResidenceLetter::class);
});

it('rejects the non alumnus path when residence history exists', function () {
    $fixture = freeResidenceLetterFixture();
    placeFreeResidenceStudent($fixture['student']);
    $application = PengajuanBebasAsrama::create(['nomor_pengajuan' => 'BA-NOT-ALUMNI', 'mahasiswa_id' => $fixture['student']->id, 'alasan' => 'Surat', 'lifecycle_year' => 2025, 'status' => FreeResidenceLetterStatus::Diverifikasi, 'legacy_verification_path' => LegacyFreeResidenceVerificationPath::NotAlumni]);

    expect(fn () => (new ApproveFreeResidenceLetter)->handle($application, $fixture['approver']))->toThrow(ValidationException::class);
    Queue::assertNothingPushed();
});

it('requires both payment evidence and bank statement for a paid legacy alumnus', function () {
    $fixture = freeResidenceLetterFixture();
    $application = PengajuanBebasAsrama::create(['nomor_pengajuan' => 'BA-EVIDENCE', 'mahasiswa_id' => $fixture['student']->id, 'alasan' => 'Surat', 'lifecycle_year' => 2025, 'status' => FreeResidenceLetterStatus::Diverifikasi, 'legacy_verification_path' => LegacyFreeResidenceVerificationPath::AlumniPaid, 'payment_evidence_path' => 'payment.pdf']);

    expect(fn () => (new ApproveFreeResidenceLetter)->handle($application, $fixture['approver']))->toThrow(ValidationException::class);
    Queue::assertNothingPushed();
});

it('saves paid alumni classification before requesting evidence and permits only service administrators', function () {
    $this->seed(RolePermissionSeeder::class);
    $fixture = freeResidenceLetterFixture();
    $application = PengajuanBebasAsrama::create([
        'mahasiswa_id' => $fixture['student']->id, 'nomor_pengajuan' => 'CLASSIFY-PAID',
        'alasan' => 'Surat', 'status' => FreeResidenceLetterStatus::Diajukan, 'lifecycle_year' => 2025,
    ]);
    $facilitator = User::factory()->create()->assignRole('fasilitator');
    $payload = ['status' => 'disetujui', 'legacy_verification_path' => 'alumni_paid'];
    $this->actingAs($facilitator)->post(route('andalas.pengajuan.bebas.approve', $application), $payload)->assertForbidden();
    $admin = $fixture['approver']->assignRole('admin_layanan');
    $this->actingAs($admin)->post(route('andalas.pengajuan.bebas.approve', $application), $payload)->assertSessionHasNoErrors();

    expect($application->fresh()->status)->toBe(FreeResidenceLetterStatus::Diverifikasi)
        ->and($application->fresh()->legacy_verification_path)->toBe(LegacyFreeResidenceVerificationPath::AlumniPaid);
    Queue::assertNotPushed(GenerateFreeResidenceLetter::class);
});

it('shows a rejection to legacy applicants incorrectly classified as non alumni', function () {
    $fixture = freeResidenceLetterFixture();
    placeFreeResidenceStudent($fixture['student']);
    $application = PengajuanBebasAsrama::create([
        'mahasiswa_id' => $fixture['student']->id, 'nomor_pengajuan' => 'NOT-ALUMNI-REJECT',
        'alasan' => 'Surat', 'status' => FreeResidenceLetterStatus::Diajukan, 'lifecycle_year' => 2025,
    ]);
    $fixture['approver']->givePermissionTo(Permission::findOrCreate('free-residence.review'));

    $this->actingAs($fixture['approver'])->post(route('andalas.pengajuan.bebas.approve', $application), [
        'status' => 'disetujui', 'legacy_verification_path' => 'not_alumni',
    ])->assertSessionHasNoErrors()->assertSessionHas('toast.type', 'error');

    expect($application->fresh()->status)->toBe(FreeResidenceLetterStatus::Ditolak)
        ->and($application->fresh()->catatan_penolakan)->toContain('tercatat sebagai alumni');
    Queue::assertNotPushed(GenerateFreeResidenceLetter::class);
});

it('records a legacy payment without issuing the letter until the remaining debt is settled', function () {
    $fixture = freeResidenceLetterFixture();
    $first = Tagihan::create(['nomor' => 'LEGACY-FIRST', 'mahasiswa_id' => $fixture['student']->id, 'total' => 100, 'status' => TagihanStatus::Terbit]);
    $second = Tagihan::create(['nomor' => 'LEGACY-SECOND', 'mahasiswa_id' => $fixture['student']->id, 'total' => 50, 'status' => TagihanStatus::Terbit]);
    $application = PengajuanBebasAsrama::create([
        'mahasiswa_id' => $fixture['student']->id, 'nomor_pengajuan' => 'LEGACY-TWO-INVOICES',
        'alasan' => 'Surat', 'status' => FreeResidenceLetterStatus::Diverifikasi, 'lifecycle_year' => 2025,
        'legacy_verification_path' => LegacyFreeResidenceVerificationPath::AlumniUnpaid, 'tagihan_id' => $first->id,
    ]);
    app(PostPayment::class)->handle('LEGACY-PAY-FIRST', $fixture['student']->id, now()->toDateTimeString(), [['tagihan_id' => $first->id, 'jumlah' => 100]]);
    expect($first->fresh()->status)->toBe(TagihanStatus::Lunas)
        ->and($application->fresh()->status)->toBe(FreeResidenceLetterStatus::Diverifikasi);
    Queue::assertNotPushed(GenerateFreeResidenceLetter::class);

    app(PostPayment::class)->handle('LEGACY-PAY-SECOND', $fixture['student']->id, now()->toDateTimeString(), [['tagihan_id' => $second->id, 'jumlah' => 50]]);
    expect($application->fresh()->status)->toBe(FreeResidenceLetterStatus::Disetujui)
        ->and($fixture['student']->user->fresh()->status)->toBe('nonaktif');
    Queue::assertPushed(GenerateFreeResidenceLetter::class);
});
