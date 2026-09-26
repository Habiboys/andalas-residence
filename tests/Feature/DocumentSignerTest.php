<?php

use App\Actions\ApproveFreeResidenceLetter;
use App\Enums\FreeResidenceLetterStatus;
use App\Enums\LegacyFreeResidenceVerificationPath;
use App\Models\DocumentSigner;
use App\Models\FreeResidenceLetterDocumentIntent;
use App\Models\MahasiswaProfil;
use App\Models\PengajuanBebasAsrama;
use App\Models\User;
use App\Services\DocumentNumber;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

function signerPayload(array $overrides = []): array
{
    return array_merge([
        'nama' => 'Dr. Ir. Budi Santoso, M.T.',
        'nip' => '197505121994031002',
        'jabatan' => 'Pengelola Asrama',
        'unit' => 'Universitas Andalas',
    ], $overrides);
}

function documentIntentFor(User $student, array $attributes = []): FreeResidenceLetterDocumentIntent
{
    $profile = MahasiswaProfil::create([
        'user_id' => $student->id,
        'angkatan' => 2026,
        'barcode_code' => fake()->unique()->uuid(),
    ]);
    $application = PengajuanBebasAsrama::create([
        'nomor_pengajuan' => 'BA-'.fake()->unique()->numerify('####'),
        'mahasiswa_id' => $profile->id,
        'alasan' => 'Selesai tinggal',
        'status' => FreeResidenceLetterStatus::Disetujui,
        'lifecycle_year' => 2026,
        'approved_at' => now(),
        'document_kind' => 'not_resident',
        'legacy_verification_path' => LegacyFreeResidenceVerificationPath::NotAlumni,
    ]);

    return FreeResidenceLetterDocumentIntent::create(array_merge([
        'pengajuan_id' => $application->id,
        'status' => 'ready',
        'nomor' => 'SBA/UNAND/2026/0001',
        'verification_token' => (string) Str::uuid(),
        'signer_name' => 'Dr. Ir. Budi Santoso, M.T.',
        'signer_nip' => '197505121994031002',
        'path' => 'documents/free-residence/test.pdf',
        'checksum_sha256' => hash('sha256', 'test'),
        'template_version' => 'residence-snapshot-v4',
        'requested_at' => now(),
        'generated_at' => now(),
    ], $attributes));
}

it('keeps a single active signer and snapshots it when a letter is approved', function () {
    $this->seed(RolePermissionSeeder::class);
    $first = DocumentSigner::create(signerPayload());
    $second = DocumentSigner::create(signerPayload(['nama' => 'Dr. Sinta Wijaya, M.Si.', 'nip' => '198001012005011001']));

    $this->actingAs(User::factory()->create()->assignRole('staff_admin'))
        ->post(route('admin.penandatangan.activate', $second))
        ->assertRedirect();

    expect($first->fresh()->aktif)->toBeFalse()
        ->and($second->fresh()->aktif)->toBeTrue()
        ->and(DocumentSigner::query()->aktif()->count())->toBe(1);

    $student = User::factory()->create();
    $application = PengajuanBebasAsrama::create([
        'nomor_pengajuan' => 'BA-SNAPSHOT',
        'mahasiswa_id' => MahasiswaProfil::create([
            'user_id' => $student->id,
            'angkatan' => 2026,
            'barcode_code' => fake()->uuid(),
        ])->id,
        'alasan' => 'Selesai tinggal',
        'status' => FreeResidenceLetterStatus::Diverifikasi,
        'lifecycle_year' => 2026,
        'legacy_verification_path' => LegacyFreeResidenceVerificationPath::NotAlumni,
    ]);

    $approved = app(ApproveFreeResidenceLetter::class)->handle($application, User::factory()->create());

    expect($approved->document_snapshot['signer'])->toBe('Dr. Sinta Wijaya, M.Si.')
        ->and($approved->document_snapshot['signerNip'])->toBe('198001012005011001')
        ->and($approved->document_snapshot['signerJabatan'])->toBe('Pengelola Asrama')
        ->and($approved->documentIntent->signer_name)->toBe('Dr. Sinta Wijaya, M.Si.')
        ->and($approved->documentIntent->signer_nip)->toBe('198001012005011001')
        ->and($approved->documentIntent->verification_token)->not->toBeNull();
});

it('manages signers only for staff with document permissions', function () {
    $this->seed(RolePermissionSeeder::class);

    $this->actingAs(User::factory()->create()->assignRole('staff_admin'))
        ->get(route('admin.kelola-penandatangan'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('admin/kelola-penandatangan')->has('signers', 0));

    $this->actingAs(User::factory()->create()->assignRole('mahasiswa'))
        ->get(route('admin.kelola-penandatangan'))
        ->assertForbidden();

    $this->actingAs(User::factory()->create()->assignRole('teknisi'))
        ->post(route('admin.penandatangan.store'), signerPayload())
        ->assertForbidden();

    $this->actingAs(User::factory()->create()->assignRole('staff_admin'))
        ->post(route('admin.penandatangan.store'), signerPayload())
        ->assertSessionHasNoErrors();

    $signer = DocumentSigner::sole();
    expect($signer->nama)->toBe('Dr. Ir. Budi Santoso, M.T.');

    $this->actingAs(User::factory()->create()->assignRole('staff_admin'))
        ->put(route('admin.penandatangan.update', $signer), signerPayload(['nama' => 'Dr. Budi Santoso, M.T.', 'nip' => null]))
        ->assertSessionHasNoErrors();
    expect($signer->fresh()->nama)->toBe('Dr. Budi Santoso, M.T.')
        ->and($signer->fresh()->nip)->toBeNull();

    $this->actingAs(User::factory()->create()->assignRole('staff_admin'))
        ->put(route('admin.penandatangan.update', $signer), ['jabatan' => 'Tanpa Nama'])
        ->assertSessionHasErrors('nama');

    $this->actingAs(User::factory()->create()->assignRole('staff_admin'))
        ->post(route('admin.penandatangan.store'), signerPayload(['nama' => 'Dr. Sinta Wijaya, M.Si.']))
        ->assertSessionHasNoErrors();
    $cadangan = DocumentSigner::whereKeyNot($signer->getKey())->sole();

    $this->actingAs(User::factory()->create()->assignRole('staff_admin'))
        ->post(route('admin.penandatangan.activate', $signer));

    $this->actingAs(User::factory()->create()->assignRole('staff_admin'))
        ->delete(route('admin.penandatangan.destroy', $signer))
        ->assertStatus(422);

    $this->actingAs(User::factory()->create()->assignRole('staff_admin'))
        ->delete(route('admin.penandatangan.destroy', $cadangan))
        ->assertRedirect();
    expect(DocumentSigner::pluck('id')->all())->toBe([$signer->id]);
});

it('issues sequential document numbers per year and honours manual numbers', function () {
    $number = app(DocumentNumber::class);

    expect($number->next('surat_bebas_asrama', 'SBA'))->toBe('SBA/UNAND/'.now()->year.'/0001')
        ->and($number->next('surat_bebas_asrama', 'SBA'))->toBe('SBA/UNAND/'.now()->year.'/0002')
        ->and($number->next('surat_bebas_asrama', 'SBA', now()->year - 1))->toBe('SBA/UNAND/'.(now()->year - 1).'/0001');

    $this->assertDatabaseCount('document_number_sequences', 2);
});

it('verifies a published letter publicly and rejects unknown or unpublished tokens', function () {
    $intent = documentIntentFor(User::factory()->create());

    $this->get(route('dokumen.verifikasi', $intent->verification_token))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('valid', true)
            ->where('document.nomor', 'SBA/UNAND/2026/0001')
            ->where('document.penandatangan', 'Dr. Ir. Budi Santoso, M.T.')
            ->where('document.nip_penandatangan', '197505121994031002')
            ->where('document.jenis', 'SURAT KETERANGAN TIDAK TINGGAL DI ASRAMA')
            ->has('document.nama')
        );

    $this->get(route('dokumen.verifikasi', 'token-tidak-dikenal'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('valid', false)->where('document', null));

    $pending = documentIntentFor(User::factory()->create(), ['status' => 'pending', 'nomor' => null, 'generated_at' => null]);
    $this->get(route('dokumen.verifikasi', $pending->verification_token))
        ->assertInertia(fn (Assert $page) => $page->where('valid', false)->where('document', null));
});
