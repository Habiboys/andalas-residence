<?php

use App\Actions\ApproveFreeResidenceLetter;
use App\Actions\Checkout\CreateCheckoutRequest;
use App\Enums\CheckoutRequestStatus;
use App\Enums\ClearanceStatus;
use App\Enums\FreeResidenceLetterStatus;
use App\Enums\LegacyFreeResidenceVerificationPath;
use App\Jobs\GenerateFreeResidenceLetter;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\PengajuanBebasAsrama;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;

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
        'graduation_evidence_path' => $path === LegacyFreeResidenceVerificationPath::NotAlumni ? null : 'private/evidence/graduation.pdf',
        'payment_evidence_path' => $path === LegacyFreeResidenceVerificationPath::AlumniPaid ? 'private/evidence/payment.pdf' : null,
    ]);

    $approved = (new ApproveFreeResidenceLetter)->handle($application, $fixture['approver']);
    $repeated = (new ApproveFreeResidenceLetter)->handle($approved, $fixture['approver']);

    expect($approved->status)->toBe(FreeResidenceLetterStatus::Disetujui)
        ->and($repeated->id)->toBe($approved->id);
    $this->assertDatabaseCount('free_residence_letter_document_intents', 1);
    $this->assertDatabaseCount('pengajuan_bebas_asrama_status_histories', 1);
})->with(LegacyFreeResidenceVerificationPath::cases());

it('approves a 2026 application only after checkout and clearances', function () {
    $fixture = freeResidenceLetterFixture();
    placeFreeResidenceStudent($fixture['student']);
    $checkout = (new CreateCheckoutRequest)->handle($fixture['student']);
    $checkout->update(['status' => CheckoutRequestStatus::Selesai, 'selesai_at' => now()]);
    $checkout->assetClearance->update(['status' => ClearanceStatus::Disetujui, 'cleared_at' => now()]);
    $checkout->financeClearance->update(['status' => ClearanceStatus::Disetujui, 'outstanding_amount' => 0, 'cleared_at' => now()]);
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
        'alasan' => 'Belum clearance',
        'status' => FreeResidenceLetterStatus::Diverifikasi,
        'lifecycle_year' => 2026,
        'checkout_request_id' => $checkout->id,
    ]);

    expect(fn () => (new ApproveFreeResidenceLetter)->handle($application, $fixture['approver']))
        ->toThrow(ValidationException::class);

    $this->assertDatabaseHas('pengajuan_bebas_asrama', ['id' => $application->id, 'status' => 'verifikasi_aset_dan_keuangan']);
    $this->assertDatabaseCount('pengajuan_bebas_asrama_status_histories', 0);
    $this->assertDatabaseCount('free_residence_letter_document_intents', 0);
});
