<?php

use App\Actions\ApproveFreeResidenceLetter;
use App\Actions\Billing\CreateTagihan;
use App\Actions\Billing\PostPayment;
use App\Enums\FreeResidenceLetterStatus;
use App\Enums\LegacyFreeResidenceVerificationPath;
use App\Jobs\GenerateBillingDocument;
use App\Jobs\GenerateFreeResidenceLetter;
use App\Models\FreeResidenceLetterDocumentIntent;
use App\Models\MahasiswaProfil;
use App\Models\PengajuanBebasAsrama;
use App\Models\User;
use App\Notifications\DocumentReadyNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

function documentStudent(): MahasiswaProfil
{
    return MahasiswaProfil::create([
        'user_id' => User::factory()->create()->id,
        'angkatan' => 2026,
        'barcode_code' => fake()->unique()->uuid(),
    ]);
}

it('queues invoice and receipt generation after committed billing writes', function () {
    Queue::fake([GenerateBillingDocument::class]);
    $student = documentStudent();
    $invoice = app(CreateTagihan::class)->handle(
        $student,
        'INV-DOC-001',
        [['deskripsi' => 'Sewa', 'kuantitas' => 1, 'harga_satuan' => 500000]],
    );

    Queue::assertPushed(GenerateBillingDocument::class, fn (GenerateBillingDocument $job): bool => $job->tagihanId === $invoice->id && $job->jenis === 'invoice');

    $payment = app(PostPayment::class)->handle(
        'PAY-DOC-001',
        $student->id,
        '2026-09-15 09:00:00',
        [['tagihan_id' => $invoice->id, 'jumlah' => 500000]],
    );

    Queue::assertPushed(GenerateBillingDocument::class, fn (GenerateBillingDocument $job): bool => $job->jenis === 'receipt' && $job->pembayaranTagihanId === $payment->id);
});

it('generates immutable private billing documents idempotently and notifies the student', function () {
    Queue::fake([GenerateBillingDocument::class]);
    Storage::fake('local');
    Notification::fake();
    $student = documentStudent();
    $invoice = app(CreateTagihan::class)->handle(
        $student,
        'INV-DOC-002',
        [['deskripsi' => 'Sewa', 'kuantitas' => 1, 'harga_satuan' => 500000]],
    );
    $job = new GenerateBillingDocument($invoice->id, 'invoice');

    $job->handle();
    $job->handle();

    $document = $invoice->dokumen()->sole();
    Storage::disk('local')->assertExists($document->path);
    expect($document->nomor)->toBe('INV-DOC-002')
        ->and($document->template_version)->toBe('billing-v1')
        ->and($document->checksum_sha256)->toHaveLength(64);
    $this->assertDatabaseCount('dokumen_tagihan', 1);
    Notification::assertSentTo(
        $student->user,
        DocumentReadyNotification::class,
        fn (DocumentReadyNotification $notification): bool => $notification->documentNumber === 'INV-DOC-002',
    );
});

it('generates a free residence letter from its intent and records terminal failure', function () {
    Queue::fake([GenerateFreeResidenceLetter::class]);
    Storage::fake('local');
    Notification::fake();
    $student = documentStudent();
    $approver = User::factory()->create();
    $application = PengajuanBebasAsrama::create([
        'nomor_pengajuan' => 'BA-DOC-001',
        'mahasiswa_id' => $student->id,
        'alasan' => 'Selesai tinggal',
        'status' => FreeResidenceLetterStatus::Diverifikasi,
        'lifecycle_year' => 2025,
        'legacy_verification_path' => LegacyFreeResidenceVerificationPath::NotAlumni,
    ]);

    $approved = app(ApproveFreeResidenceLetter::class)->handle($application, $approver);
    Queue::assertPushed(GenerateFreeResidenceLetter::class, fn (GenerateFreeResidenceLetter $job): bool => $job->intentId === $approved->documentIntent->id);

    $job = new GenerateFreeResidenceLetter($approved->documentIntent->id);
    $job->handle();
    $job->handle();

    $intent = $approved->documentIntent->fresh();
    Storage::disk('local')->assertExists($intent->path);
    expect($intent->status)->toBe('ready')
        ->and($intent->nomor)->toBe('SBA-BA-DOC-001')
        ->and($intent->template_version)->toBe('free-residence-v1')
        ->and($intent->checksum_sha256)->toHaveLength(64);
    Notification::assertSentTo($student->user, DocumentReadyNotification::class);

    $failedIntent = FreeResidenceLetterDocumentIntent::create([
        'pengajuan_id' => PengajuanBebasAsrama::create([
            'nomor_pengajuan' => 'BA-DOC-FAILED',
            'mahasiswa_id' => $student->id,
            'alasan' => 'Failure fixture',
            'status' => FreeResidenceLetterStatus::Diverifikasi,
        ])->id,
        'status' => 'pending',
        'requested_at' => now(),
    ]);
    (new GenerateFreeResidenceLetter($failedIntent->id))->failed(new RuntimeException('Renderer unavailable'));

    expect($failedIntent->fresh()->status)->toBe('failed')
        ->and($failedIntent->fresh()->failure_reason)->toBe('Renderer unavailable');
});
