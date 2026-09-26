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
use App\Services\FreeResidenceLetterFormat;
use Barryvdh\DomPDF\Facade\Pdf;
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
        ->and($intent->nomor)->toBe('SBA/UNAND/'.now()->year.'/0001')
        ->and($intent->verification_token)->not->toBeNull()
        ->and($intent->signer_name)->toBe(config('residence.letter_signer'))
        ->and($intent->template_version)->toBe(FreeResidenceLetterFormat::VERSION)
        ->and($intent->checksum_sha256)->toHaveLength(64);
    Notification::assertSentTo($student->user, DocumentReadyNotification::class);
    $html = view('pdf.surat-bebas-asrama', [
        'pengajuan' => $approved,
        'mahasiswa' => $student,
        'documentNumber' => $intent->nomor,
        'verificationQr' => 'data:image/png;base64,AAAA',
    ])->render();
    expect($html)->toContain('SURAT KETERANGAN TIDAK TINGGAL DI ASRAMA', 'images/unand.png', $student->user->nim_nip, 'data:image/png;base64,AAAA')
        ->not->toContain('CONTOH / DUMMY', 'telah melunasi uang asrama');

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

it('attaches the generated PDF to the document notification email', function () {
    Storage::fake('local');
    Storage::disk('local')->put('documents/test-letter.pdf', '%PDF-1.4');
    $notification = new DocumentReadyNotification('surat_bebas_asrama', 'SBA-TEST', 'documents/test-letter.pdf');
    $mail = $notification->toMail(User::factory()->make());
    expect($mail->attachments)->toHaveCount(1)
        ->and($mail->attachments[0]['options']['as'])->toBe('SBA-TEST.pdf');
});

it('selects the letter wording from verified residence status and funding category', function (string $category, ?string $path, string $title) {
    $student = documentStudent();
    $student->user->update(['client_profile_category' => $category]);
    $application = PengajuanBebasAsrama::create([
        'nomor_pengajuan' => 'FORMAT-TEST', 'mahasiswa_id' => $student->id,
        'alasan' => 'Selesai', 'status' => FreeResidenceLetterStatus::Disetujui,
        'legacy_verification_path' => $path, 'approved_at' => '2026-09-24 07:17:33',
    ]);
    $html = view('pdf.surat-bebas-asrama', ['pengajuan' => $application, 'mahasiswa' => $student, 'documentNumber' => '674/B/Asrama-XIV/UA/2026'])->render();
    expect($html)->toContain($title, '674/B/Asrama-XIV/UA/2026', '24 September 2026', '14:17:33', 'Fatmasari, Amd.Kep')
        ->not->toContain('NIP. ');
    if ($category === 'local_kipk' || $category === 'international_free_facility') {
        expect($html)->not->toContain('telah melunasi uang asrama');
    }
    $pdf = Pdf::loadHTML($html)->setPaper('a4');
    expect($pdf->output())->toStartWith('%PDF-');
    expect($pdf->getDomPDF()->getCanvas()->get_page_count())->toBe(1);
})->with([
    ['local_kipk', 'not_alumni', 'SURAT KETERANGAN TIDAK TINGGAL DI ASRAMA'],
    ['local_non_kipk', 'alumni_paid', 'SURAT KETERANGAN TELAH MEMBAYAR UANG ASRAMA'],
    ['local_non_kipk', 'alumni_unpaid', 'SURAT KETERANGAN TELAH MEMBAYAR UANG ASRAMA'],
    ['local_non_kipk', null, 'SURAT KETERANGAN TELAH MEMBAYAR UANG ASRAMA'],
    ['local_kipk', null, 'SURAT KETERANGAN BEBAS ASRAMA'],
    ['international_free_facility', null, 'SURAT KETERANGAN BEBAS ASRAMA'],
]);
