<?php

use App\Enums\FreeResidenceLetterStatus;
use App\Models\DokumenTagihan;
use App\Models\FreeResidenceLetterDocumentIntent;
use App\Models\InvoiceGroup;
use App\Models\MahasiswaProfil;
use App\Models\PengajuanBebasAsrama;
use App\Models\Tagihan;
use App\Models\User;
use App\Services\LetterheadTemplateService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

it('parses the official Kop_Surat_Asrama.docx template directly for PDF letterheads', function () {
    $data = app(LetterheadTemplateService::class)->data();

    expect(is_file($data['template_path']))->toBeTrue()
        ->and($data['font_name'])->toBe('Times New Roman')
        ->and($data['font_css'])->toContain('"Times-Roman"', '"Times New Roman"')
        ->and($data['font_css'])->not->toContain('DejaVu')
        ->and($data['margins']['left_pt'])->toBe(56.7)
        ->and($data['logo']['width_pt'])->toBe(63.1)
        ->and($data['logo']['height_pt'])->toBe(78.0)
        ->and($data['border']['style'])->toBe('thinThickSmallGap')
        ->and($data['lines'])->toHaveCount(7);

    $texts = array_map(
        static fn (array $line): string => implode('', array_column($line['runs'], 'text')),
        $data['lines'],
    );

    expect($texts[0])->toBe('KEMENTERIAN PENDIDIKAN TINGGI, SAINS,')
        ->and($texts[1])->toBe('DAN TEKNOLOGI')
        ->and($texts[2])->toBe('UNIVERSITAS ANDALAS')
        ->and($texts[3])->toBe('ANDALAS RESIDENCE')
        ->and($texts[4])->toBe('Gedung Asrama Roesma/M.Syaff, Limau Manis Padang - 25163')
        ->and($texts[5])->toContain('Telp. 0811-6699634', 'Fax. 0751-71085')
        ->and($texts[6])->toContain('Laman: https://andalasresidence.unand.ac.id', 'e-mail : andalasresidence@unand.ac.id')
        ->and($data['lines'][2]['runs'][0]['bold'])->toBeTrue()
        ->and($data['lines'][3]['runs'][0]['bold'])->toBeTrue()
        ->and($data['lines'][4]['runs'][0]['size_pt'])->toBe(12.0);
});

it('renders the docx-backed letterhead cleanly in billing and amendment PDFs', function () {
    $user = User::factory()->create(['nama' => 'Budi Santoso', 'nim_nip' => '2511521001']);
    $student = MahasiswaProfil::create([
        'user_id' => $user->id,
        'angkatan' => 2026,
        'barcode_code' => fake()->unique()->uuid(),
    ]);
    $invoice = Tagihan::create([
        'nomor' => 'INV-2026-0001',
        'mahasiswa_id' => $student->id,
        'total' => 2500000,
        'total_dibayar' => 2500000,
        'status' => 'lunas',
    ]);

    $billingHtml = view('pdf.billing-document', [
        'title' => 'KWITANSI',
        'number' => 'HUNI-INV-2026-0001',
        'invoice' => $invoice,
        'payment' => null,
        'student' => $student,
        'registration' => null,
        'placement' => null,
    ])->render();

    expect($billingHtml)
        ->toContain('data-template="kop-surat-asrama.docx"', '"Times-Roman"', 'letterhead-rule-thick', 'letterhead-rule-thin', 'Gedung Asrama Roesma/M.Syaff')
        ->not->toContain('DejaVu Serif', 'Alamat: Gedung Asrama');

    expect(Pdf::loadHTML($billingHtml)->setPaper('a4')->output())->toStartWith('%PDF-');

    $record = (object) [
        'id' => 'AMD-001',
        'kind' => 'move',
        'reason' => 'Mutasi kamar atas permohonan mahasiswa',
        'created_at' => '2026-10-01 10:00:00',
        'subject_id' => 'INV-2026-0001',
    ];
    $amendmentHtml = view('pdf.residence-amendment', [
        'record' => $record,
        'before' => ['room_label' => 'RPX / 101', 'total' => 2500000],
        'after' => ['effective_at' => '2026-10-02', 'room_label' => 'RPX / 102', 'total' => 2500000, 'paid' => 2500000],
    ])->render();

    expect($amendmentHtml)->toContain('data-template="kop-surat-asrama.docx"', '"Times-Roman"', 'letterhead-rule-thick', 'letterhead-rule-thin');
    expect(Pdf::loadHTML($amendmentHtml)->setPaper('a4')->output())->toStartWith('%PDF-');
});

it('refreshes existing cached PDFs on disk using the docx letterhead template', function () {
    Storage::fake('local');

    $user = User::factory()->create(['nama' => 'Siti Aminah', 'nim_nip' => '2511521002']);
    $student = MahasiswaProfil::create([
        'user_id' => $user->id,
        'angkatan' => 2026,
        'barcode_code' => fake()->unique()->uuid(),
    ]);

    $application = PengajuanBebasAsrama::create([
        'nomor_pengajuan' => 'BA-REFRESH-1',
        'nomor_surat_resmi' => 'SBA/UNAND/2026/0099',
        'mahasiswa_id' => $student->id,
        'alasan' => 'Selesai hunian',
        'status' => FreeResidenceLetterStatus::Disetujui,
        'approved_at' => now(),
    ]);
    $letterPath = 'documents/free-residence/test-refresh.pdf';
    Storage::disk('local')->put($letterPath, 'OLD-PDF');
    $intent = FreeResidenceLetterDocumentIntent::create([
        'pengajuan_id' => $application->id,
        'status' => 'ready',
        'nomor' => 'SBA/UNAND/2026/0099',
        'path' => $letterPath,
        'checksum_sha256' => hash('sha256', 'OLD-PDF'),
        'requested_at' => now(),
    ]);

    $invoice = Tagihan::create([
        'nomor' => 'INV-REFRESH-1',
        'mahasiswa_id' => $student->id,
        'total' => 1500000,
        'total_dibayar' => 0,
        'status' => 'terbit',
    ]);
    $billingPath = 'documents/billing/inv-refresh-1.pdf';
    Storage::disk('local')->put($billingPath, 'OLD-BILLING');
    $billingDoc = DokumenTagihan::create([
        'tagihan_id' => $invoice->id,
        'jenis' => 'invoice',
        'nomor' => 'INV-REFRESH-1',
        'path' => $billingPath,
        'checksum_sha256' => hash('sha256', 'OLD-BILLING'),
        'template_version' => 'billing-v1',
        'diterbitkan_pada' => now(),
    ]);

    $groupPath = 'documents/invoice-groups/group-refresh-1.pdf';
    Storage::disk('local')->put($groupPath, 'OLD-GROUP');
    InvoiceGroup::create([
        'nomor' => 'GRP-REFRESH-1',
        'payer_type' => 'sponsor',
        'invoice_ids' => [$invoice->id],
        'snapshot' => [
            'nomor' => 'GRP-REFRESH-1',
            'date' => '2026-10-07',
            'recipient' => 'Rektor',
            'institution' => 'Universitas Andalas',
            'subject' => 'Tagihan',
            'bank' => 'BSI',
            'account_number' => '123',
            'account_name' => 'AR',
            'due_date' => '2026-10-14',
            'signer' => 'Pimpinan',
            'administration_signer' => 'Admin',
            'total' => 1500000,
            'rows' => [['nama' => 'Siti Aminah', 'nim' => '2511521002', 'nomor' => 'INV-REFRESH-1', 'residence' => null, 'amount' => 1500000]],
        ],
        'path' => $groupPath,
        'created_by' => $user->id,
    ]);

    $this->artisan('documents:refresh-pdfs')->assertSuccessful();

    expect(Storage::disk('local')->get($letterPath))->toStartWith('%PDF-')
        ->and($intent->fresh()->checksum_sha256)->not->toBe(hash('sha256', 'OLD-PDF'))
        ->and(Storage::disk('local')->get($billingPath))->toStartWith('%PDF-')
        ->and($billingDoc->fresh()->checksum_sha256)->not->toBe(hash('sha256', 'OLD-BILLING'))
        ->and(Storage::disk('local')->get($groupPath))->toStartWith('%PDF-');
});
