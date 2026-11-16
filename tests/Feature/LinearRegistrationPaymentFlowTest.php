<?php

use App\Enums\TagihanStatus;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\PaymentBankAccount;
use App\Models\Pembayaran;
use App\Models\ResidencePaymentReference;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo(now()->setDate(2026, 11, 16)->startOfDay());
    $this->withoutVite();
    Queue::fake();
    Notification::fake();
    Storage::fake('local');
});

it('allows cancelling an unpaid registration so the student returns to step 1 and blocks cancellation after payment', function () {
    $f = toBeFixture('local_non_kipk', 2);
    $facilitator = toBeFacilitator($f['building']);

    $buildingB = Gedung::create(['kode_gedung' => 'B-ALT', 'nama_gedung' => 'Gedung Alternatif', 'gender_peruntukan' => 'perempuan']);
    $floorB = Lantai::create(['gedung_id' => $buildingB->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $roomB = Kamar::create(['lantai_id' => $floorB->id, 'nomor_kamar' => '202', 'tipe_kamar' => 'standar', 'kapasitas' => 2, 'tarif_per_periode' => 1000000, 'status' => 'kosong']);

    $settings = $f['policy']->settings;
    $settings['building_ids'][] = $buildingB->id;
    $settings['rates'][] = ['gedung_id' => $buildingB->id, 'type' => 'standar', 'unit' => 'year', 'amount' => '1000000', 'room_amount' => '10000000'];
    $f['policy']->update(['settings' => $settings]);

    $reg1 = toBeSubmit($f, ['billing_basis' => 'person']);
    $invoice1 = $reg1->tagihan;

    $this->actingAs($f['user'])
        ->get(route('mahasiswa.registration'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('registration.0.can_cancel', true)
            ->where('registration.0.payment_unlocked', false)
        );

    $this->actingAs($f['user'])
        ->get(route('mahasiswa.tagihan'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('billing.0.payment_unlocked', false)
        );

    $this->actingAs($f['user'])
        ->post(route('residence.cancel', $reg1))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($reg1->fresh()->status->value)->toBe('cancelled')
        ->and($reg1->fresh()->allocation_status)->toBe('released')
        ->and($reg1->fresh()->reserved_room_id)->toBeNull()
        ->and($invoice1->fresh()->status)->toBe(TagihanStatus::Batal);

    // Student can immediately start a new registration in another building
    $this->actingAs($f['user'])
        ->post(route('andalas.registrations.store'), [
            'periode_id' => $f['period']->id,
            'preferences' => [['kamar_id' => $roomB->id]],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $reg2 = ResidenceRegistration::where('student_profile_id', $f['profile']->id)->whereKeyNot($reg1->id)->sole();
    expect($reg2->reserved_room_id)->toBe($roomB->id);

    // Upload and facilitator-approve document for building B
    $facilitatorB = toBeFacilitator($buildingB);
    toBeDocument($reg2, $facilitatorB);

    // Once payment proof is submitted, cancellation is blocked
    $this->actingAs($f['user'])
        ->post(route('andalas.pembayaran.store'), [
            'tagihan_id' => $reg2->tagihan_id,
            'jenis_pembayaran' => 'sewa_asrama',
            'nominal' => (float) $reg2->tagihan->total,
            'bukti_transfer' => UploadedFile::fake()->create('proof.pdf', 100, 'application/pdf'),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($f['user'])
        ->post(route('residence.cancel', $reg2))
        ->assertSessionHasErrors('registration');
});

it('unlocks payment immediately upon document upload while reserving facilitator document verification for check-in', function () {
    $f = toBeFixture('local_non_kipk', 2);
    $assignedFacilitator = toBeFacilitator($f['building']);
    $otherBuilding = Gedung::create(['kode_gedung' => 'B-OTH', 'nama_gedung' => 'Gedung Lain', 'gender_peruntukan' => 'perempuan']);
    $otherFacilitator = toBeFacilitator($otherBuilding);
    $staffAdmin = toBeOfficer('staff_admin');
    $superAdmin = toBeOfficer('superadmin');

    $account = PaymentBankAccount::create([
        'bank_name' => 'Bank Nagari',
        'account_number' => '2100020188888',
        'account_name' => 'RPL 014 UNAND Asrama',
        'instructions' => 'Sertakan NIM pada berita transfer.',
        'is_active' => true,
    ]);

    $reg = toBeSubmit($f);

    // Before doc upload: payment upload remains locked because Step 3 Upload berkas is incomplete
    $this->actingAs($f['user'])
        ->get(route('mahasiswa.tagihan'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('billing.0.payment_unlocked', false)
        );

    $this->actingAs($f['user'])
        ->get(route('mahasiswa.tagihan.show', $reg->tagihan_id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('mahasiswa/tagihan-detail')
            ->where('registration.payment_unlocked', false)
            ->where('payment_accounts.0.account_number', $account->account_number)
        );

    // Student uploads required document -> payment unlocks IMMEDIATELY without waiting for facilitator verification
    $this->actingAs($f['user'])
        ->post(route('residence.documents.upload', $reg), [
            'kind' => 'perjanjian',
            'file' => UploadedFile::fake()->create('perjanjian.pdf', 80, 'application/pdf'),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $doc = $reg->fresh()->documents()->sole();

    // Admin Layanan, Staff Admin, Superadmin, and other building facilitator are all forbidden from reviewing documents
    foreach ([$f['manager'], $staffAdmin, $superAdmin, $otherFacilitator] as $unauthorized) {
        $this->actingAs($unauthorized)
            ->post(route('residence.documents.review', $doc), ['status' => 'valid'])
            ->assertForbidden();
    }

    // Payment detail upload & invoice overview flag are ALREADY unlocked before facilitator verification
    $this->actingAs($f['user'])
        ->get(route('mahasiswa.tagihan.show', $reg->tagihan_id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('registration.payment_unlocked', true)
        );

    // Student submits payment proof immediately; status_huni becomes aktif while payment waits for DPUB check
    $this->actingAs($f['user'])
        ->post(route('andalas.pembayaran.store'), [
            'tagihan_id' => $reg->tagihan_id,
            'jenis_pembayaran' => 'sewa_asrama',
            'nominal' => (float) $reg->tagihan->total,
            'payment_bank_account_id' => $account->id,
            'nama_bank' => 'BNI',
            'nomor_rekening_pengirim' => '1234567890',
            'atas_nama_pengirim' => 'Mahasiswa Uji',
            'tanggal_bayar' => '2026-11-16 05:05:00',
            'bukti_transfer' => UploadedFile::fake()->create('bukti.pdf', 90, 'application/pdf'),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $payment = Pembayaran::where('tagihan_id', $reg->tagihan_id)->sole();
    expect($payment->payment_bank_account_id)->toBe($account->id)
        ->and($payment->rekening_tujuan)->toBe('Bank Nagari · 2100020188888 · a.n. RPL 014 UNAND Asrama')
        ->and($payment->tanggal_bayar?->format('Y-m-d H:i'))->toBe('2026-11-16 05:05')
        ->and($payment->status)->toBe('menunggu_verifikasi')
        ->and($reg->fresh()->allocation_status)->toBe('admin_occupied')
        ->and($f['profile']->fresh()->status_huni)->toBe('aktif')
        ->and((float) $reg->tagihan->fresh()->total_dibayar)->toBe(0.0);

    // Check-in requires assigned building facilitator to verify documents when resident checks in
    $this->actingAs($assignedFacilitator)
        ->post(route('residence.checkin', $reg), [
            'identity_checked' => 1,
            'original_documents_checked' => 1,
            'keys_handed' => 1,
        ])
        ->assertSessionHasErrors('checkin');

    $this->actingAs($assignedFacilitator)
        ->post(route('residence.documents.review', $doc), ['status' => 'valid'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($assignedFacilitator)
        ->post(route('residence.checkin', $reg), [
            'identity_checked' => 1,
            'original_documents_checked' => 1,
            'keys_handed' => 1,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($reg->fresh()->completed_at)->not->toBeNull();

    // Student can download own payment proof, while another student gets 403
    $this->actingAs($f['user'])
        ->get(route('andalas.pembayaran.bukti', $payment))
        ->assertOk();

    $otherStudent = User::factory()->student()->create()->assignRole('mahasiswa');
    $this->actingAs($otherStudent)
        ->get(route('andalas.pembayaran.bukti', $payment))
        ->assertForbidden();
    $this->actingAs($otherStudent)
        ->get(route('mahasiswa.tagihan.show', $reg->tagihan_id))
        ->assertForbidden();

    // Pengelola approves payment proof directly in Verifikasi Pembayaran -> status_huni becomes aktif automatically
    $this->actingAs($f['manager'])
        ->post(route('andalas.pembayaran.verify', $payment), [
            'status' => 'lunas',
            'catatan_verifikasi' => 'Cocok dengan rekening koran BSI.',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($f['profile']->fresh()->status_huni)->toBe('aktif')
        ->and($reg->fresh()->ready_at)->not->toBeNull()
        ->and($payment->fresh()->status)->toBe('lunas')
        ->and($reg->tagihan->fresh()->status)->toBe(TagihanStatus::Lunas);
});

it('stores DPUB bank statements solely as viewable archives without creating ledger transactions', function () {
    $manager = toBeOfficer('admin_layanan');

    $this->actingAs($manager)
        ->post(route('residence.payments.record'), [
            'reference' => 'RK-BSI-2026-11',
            'source' => 'Bank Syariah Indonesia RPL 014',
            'paid_at' => '2026-11-16',
            'evidence' => UploadedFile::fake()->create('rekening-koran.pdf', 120, 'application/pdf'),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $statement = ResidencePaymentReference::where('reference', 'RK-BSI-2026-11')->sole();

    $this->assertDatabaseCount('transaksi_keuangan', 0);
    $this->assertDatabaseCount('pembayaran_tagihan', 0);

    $inline = $this->actingAs($manager)
        ->get(route('residence.payments.evidence', $statement).'?inline=1')
        ->assertOk();
    expect(strtolower((string) $inline->headers->get('content-disposition')))
        ->toStartWith('inline');

    $this->actingAs($manager)
        ->get(route('admin_layanan.verifikasi-pembayaran'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('bank_statements', 1)
            ->where('bank_statements.0.reference', 'RK-BSI-2026-11')
        );

    $this->actingAs($manager)
        ->delete(route('residence.payments.destroy', $statement))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(ResidencePaymentReference::whereKey($statement->id)->exists())->toBeFalse();
});

it('lets pengelola manage official destination payment bank accounts in residence management', function () {
    $manager = toBeOfficer('admin_layanan');

    $this->actingAs($manager)
        ->post(route('andalas.residence-management.save', 'payment-account'), [
            'bank_name' => 'Bank Mandiri',
            'account_number' => '111000222333',
            'account_name' => 'Universitas Andalas Asrama',
            'instructions' => 'Tulis NIM dan nama gedung.',
            'is_active' => true,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $account = PaymentBankAccount::sole();
    expect($account->bank_name)->toBe('Bank Mandiri')
        ->and($account->is_active)->toBeTrue();

    $this->actingAs($manager)
        ->post(route('andalas.residence-management.save', 'payment-account'), [
            'id' => $account->id,
            'bank_name' => 'Bank Syariah Indonesia',
            'account_number' => '7001234567',
            'account_name' => 'RPL Asrama UNAND',
            'is_active' => false,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($account->fresh()->bank_name)->toBe('Bank Syariah Indonesia')
        ->and($account->fresh()->is_active)->toBeFalse();

    $this->actingAs($manager)
        ->delete(route('andalas.residence-management.destroy', 'payment-account'), ['id' => $account->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(PaymentBankAccount::count())->toBe(0);
});

it('stores mandatory documents and financing scheme atomically in stage 3 submission and lets students re-upload after payment proof rejection', function () {
    $f = toBeFixture('local_non_kipk', 2);
    $facilitator = toBeFacilitator($f['building']);

    // Atomic submission: room + document + financing scheme in ONE request (Step 3 -> Step 4)
    $this->actingAs($f['user'])
        ->post(route('andalas.registrations.store'), [
            'periode_id' => $f['period']->id,
            'preferences' => [['kamar_id' => $f['room']->id]],
            'files' => [
                'perjanjian' => UploadedFile::fake()->create('perjanjian.pdf', 80, 'application/pdf'),
            ],
            'decision_kind' => 'full',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $registration = ResidenceRegistration::where('student_profile_id', $f['profile']->id)->sole();
    $doc = $registration->documents()->sole();
    expect($doc->kind)->toBe('perjanjian')
        ->and($doc->status)->toBe('uploaded')
        ->and($registration->decisions()->sole()->kind)->toBe('full');

    // Building facilitator approves document -> payment unlocked
    $this->actingAs($facilitator)
        ->post(route('residence.documents.review', $doc), ['status' => 'valid'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    // Student uploads first payment proof
    $this->actingAs($f['user'])
        ->post(route('andalas.pembayaran.store'), [
            'tagihan_id' => $registration->tagihan_id,
            'jenis_pembayaran' => 'sewa_asrama',
            'nominal' => (float) $registration->tagihan->total,
            'nama_bank' => 'BRI',
            'nomor_rekening_pengirim' => '000111222',
            'atas_nama_pengirim' => 'Salah Nominal',
            'tanggal_bayar' => '2026-11-16 05:05:00',
            'bukti_transfer' => UploadedFile::fake()->create('bukti-blur.jpg', 80, 'image/jpeg'),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $firstPayment = Pembayaran::where('tagihan_id', $registration->tagihan_id)->sole();
    expect($firstPayment->status)->toBe('menunggu_verifikasi')
        ->and($f['profile']->fresh()->status_huni)->toBe('aktif')
        ->and($registration->fresh()->allocation_status)->toBe('admin_occupied');

    // Travel past original deadline to verify manager rejection refreshes expiry window safely and suspends status_huni back to calon
    $registration->update(['reservation_expires_at' => now()->subMinute()]);

    $this->actingAs($f['manager'])
        ->post(route('andalas.pembayaran.verify', $firstPayment), [
            'status' => 'ditolak',
            'catatan_verifikasi' => 'Foto bukti buram, mohon unggah ulang yang jelas.',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($firstPayment->fresh()->status)->toBe('ditolak')
        ->and($registration->fresh()->allocation_status)->toBe('held')
        ->and($registration->fresh()->reservation_expires_at?->isFuture())->toBeTrue()
        ->and($f['profile']->fresh()->status_huni)->toBe('calon');

    // Student CAN upload a corrected payment proof right away -> immediately active resident again while awaiting DPUB check
    $this->actingAs($f['user'])
        ->post(route('andalas.pembayaran.store'), [
            'tagihan_id' => $registration->tagihan_id,
            'jenis_pembayaran' => 'sewa_asrama',
            'nominal' => (float) $registration->tagihan->total,
            'nama_bank' => 'BNI',
            'nomor_rekening_pengirim' => '999888777',
            'atas_nama_pengirim' => 'Nama Benar',
            'tanggal_bayar' => '2026-11-16 16:00:00',
            'bukti_transfer' => UploadedFile::fake()->create('bukti-jelas.pdf', 90, 'application/pdf'),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(Pembayaran::where('tagihan_id', $registration->tagihan_id)->count())->toBe(2)
        ->and(Pembayaran::where('tagihan_id', $registration->tagihan_id)->where('status', 'menunggu_verifikasi')->count())->toBe(1)
        ->and($f['profile']->fresh()->status_huni)->toBe('aktif');
});

it('serves inline document previews and lets building facilitators batch-review multiple documents atomically', function () {
    $f = toBeFixture('local_non_kipk', 2);
    $facilitator = toBeFacilitator($f['building']);

    $settings = $f['policy']->settings;
    $settings['documents'] = ['ktp', 'perjanjian'];
    $f['policy']->update(['settings' => $settings]);

    $this->actingAs($f['user'])
        ->post(route('andalas.registrations.store'), [
            'periode_id' => $f['period']->id,
            'preferences' => [['kamar_id' => $f['room']->id]],
            'files' => [
                'ktp' => UploadedFile::fake()->create('ktp.jpg', 60, 'image/jpeg'),
                'perjanjian' => UploadedFile::fake()->create('perjanjian.pdf', 80, 'application/pdf'),
            ],
            'decision_kind' => 'full',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $registration = ResidenceRegistration::where('student_profile_id', $f['profile']->id)->sole();
    $ktp = $registration->documents()->where('kind', 'ktp')->sole();
    $perjanjian = $registration->documents()->where('kind', 'perjanjian')->sole();

    // Inline preview endpoint responds with inline disposition (rather than attachment) for preview modal
    $inlineResponse = $this->actingAs($facilitator)
        ->get(route('residence.documents.download', $perjanjian).'?inline=1')
        ->assertOk();
    expect(strtolower((string) $inlineResponse->headers->get('content-disposition')))
        ->toStartWith('inline');

    // Non-facilitator (e.g. pengelola / admin) cannot batch-review documents
    $this->actingAs($f['manager'])
        ->post(route('residence.documents.review-batch', $registration), [
            'reviews' => [
                ['document_id' => $ktp->id, 'status' => 'valid'],
                ['document_id' => $perjanjian->id, 'status' => 'valid'],
            ],
        ])
        ->assertForbidden();

    // Revision requires notes
    $this->actingAs($facilitator)
        ->post(route('residence.documents.review-batch', $registration), [
            'reviews' => [
                ['document_id' => $ktp->id, 'status' => 'revision', 'notes' => ''],
                ['document_id' => $perjanjian->id, 'status' => 'valid'],
            ],
        ])
        ->assertSessionHasErrors('reviews.0.notes');

    // Building facilitator batch-reviews both documents atomically in one request
    $this->actingAs($facilitator)
        ->post(route('residence.documents.review-batch', $registration), [
            'reviews' => [
                ['document_id' => $ktp->id, 'status' => 'valid'],
                ['document_id' => $perjanjian->id, 'status' => 'valid', 'notes' => 'Berkas sesuai'],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($ktp->fresh()->status)->toBe('valid')
        ->and($perjanjian->fresh()->status)->toBe('valid')
        ->and($perjanjian->fresh()->notes)->toBe('Berkas sesuai');

    $this->actingAs($f['user'])
        ->get(route('mahasiswa.tagihan'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('billing.0.payment_unlocked', true)
        );
});

it('blocks bank transfer submission with validation error when no active bank account exists and includes pending proof & finance flags on registration detail', function () {
    $f = toBeFixture('local_non_kipk', 2);
    $facilitator = toBeFacilitator($f['building']);
    $registration = toBeSubmit($f, ['billing_basis' => 'person']);
    toBeDocument($registration, $facilitator);

    // No PaymentBankAccount seeded -> UI transfer_bank submission must fail with error
    $this->actingAs($f['user'])
        ->post(route('andalas.pembayaran.store'), [
            'tagihan_id' => $registration->tagihan_id,
            'jenis_pembayaran' => 'sewa_asrama',
            'nominal' => (float) $registration->tagihan->total,
            'metode_pembayaran' => 'transfer_bank',
            'nama_bank' => 'BNI',
            'nomor_rekening_pengirim' => '1122334455',
            'atas_nama_pengirim' => 'Nouval',
            'tanggal_bayar' => '2026-11-16 09:00:00',
            'bukti_transfer' => UploadedFile::fake()->create('bukti.jpg', 60, 'image/jpeg'),
        ])
        ->assertSessionHasErrors('payment_bank_account_id');

    $account = PaymentBankAccount::create([
        'bank_name' => 'Bank Nagari',
        'account_number' => '2100020177777',
        'account_name' => 'RPL Asrama UNAND',
        'is_active' => true,
    ]);

    // Once admin adds active bank account, transfer succeeds and shows on Pengelola Detail Pengajuan
    $this->actingAs($f['user'])
        ->post(route('andalas.pembayaran.store'), [
            'tagihan_id' => $registration->tagihan_id,
            'jenis_pembayaran' => 'sewa_asrama',
            'nominal' => (float) $registration->tagihan->total,
            'metode_pembayaran' => 'transfer_bank',
            'payment_bank_account_id' => $account->id,
            'nama_bank' => 'BNI',
            'nomor_rekening_pengirim' => '1122334455',
            'atas_nama_pengirim' => 'Nouval',
            'tanggal_bayar' => '2026-11-16 09:05:00',
            'bukti_transfer' => UploadedFile::fake()->create('bukti.jpg', 60, 'image/jpeg'),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($f['manager'])
        ->get(route('residence.registrations.show', $registration))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('finance', true)
            ->has('registrations.data.0.tagihan.pembayaran', 1)
            ->where('registrations.data.0.tagihan.pembayaran.0.status', 'menunggu_verifikasi')
        );
});

it('disallows student installment submission in the system while allowing pengelola to convert full billing into installment schedule after leader offline approval', function () {
    $f = toBeFixture('local_non_kipk', 2);

    // Student cannot request installment directly during Step 3 registration
    $this->actingAs($f['user'])
        ->post(route('andalas.registrations.store'), [
            'periode_id' => $f['period']->id,
            'preferences' => [['kamar_id' => $f['room']->id]],
            'files' => [
                'perjanjian' => UploadedFile::fake()->create('perjanjian.pdf', 80, 'application/pdf'),
            ],
            'decision_kind' => 'installment',
            'decision_reason' => 'Minta cicil',
        ])
        ->assertSessionHasErrors('decision_kind');

    // Standard full registration succeeds
    $this->actingAs($f['user'])
        ->post(route('andalas.registrations.store'), [
            'periode_id' => $f['period']->id,
            'preferences' => [['kamar_id' => $f['room']->id]],
            'files' => [
                'perjanjian' => UploadedFile::fake()->create('perjanjian.pdf', 80, 'application/pdf'),
            ],
            'decision_kind' => 'full',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $registration = ResidenceRegistration::where('student_profile_id', $f['profile']->id)->sole();
    expect($registration->decisions()->where('kind', 'full')->where('status', 'approved')->count())->toBe(1);

    // Student cannot submit installment request via decisions.request endpoint either
    $this->actingAs($f['user'])
        ->post(route('residence.decisions.request', $registration), [
            'kind' => 'installment',
            'reason' => 'Minta cicil lewat sistem',
        ])
        ->assertForbidden();

    // After student gets offline approval from Pimpinan, Pengelola converts the billing scheme & schedule
    $total = (int) round((float) $registration->tagihan->total);
    $firstTerm = intdiv($total, 2);
    $secondTerm = $total - $firstTerm;

    $this->actingAs($f['manager'])
        ->post(route('residence.decisions.request', $registration), [
            'kind' => 'installment',
            'offline_approval' => true,
            'status' => 'approved',
            'approval_basis' => 'Surat Persetujuan Pimpinan Tatap Muka #01',
            'initial_amount' => $firstTerm,
            'schedule' => [
                ['jatuh_tempo' => today()->addDays(7)->toDateString(), 'jumlah' => $firstTerm],
                ['jatuh_tempo' => today()->addMonth()->toDateString(), 'jumlah' => $secondTerm],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $registration->refresh();
    expect($registration->decisions()->where('kind', 'full')->sole()->status)->toBe('superseded')
        ->and($registration->decisions()->where('kind', 'installment')->sole()->status)->toBe('approved')
        ->and($registration->tagihan->jadwalCicilan()->count())->toBe(2)
        ->and((float) $registration->tagihan->amount_due_now)->toBe((float) $firstTerm);
});

it('formats registration invoice nomor as REG-<NIM> with safe unique suffix on re-registration', function () {
    $f = toBeFixture('local_non_kipk', 2);
    $f['user']->update(['nim_nip' => '2211523012']);

    $this->actingAs($f['user'])
        ->post(route('andalas.registrations.store'), [
            'periode_id' => $f['period']->id,
            'preferences' => [['kamar_id' => $f['room']->id]],
            'files' => [
                'perjanjian' => UploadedFile::fake()->create('perjanjian.pdf', 80, 'application/pdf'),
            ],
            'decision_kind' => 'full',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $first = ResidenceRegistration::where('student_profile_id', $f['profile']->id)
        ->where('status', 'submitted')
        ->sole();

    expect($first->tagihan->nomor)->toBe('REG-2211523012');

    $this->actingAs($f['user'])
        ->post(route('residence.cancel', $first))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($f['user'])
        ->post(route('andalas.registrations.store'), [
            'periode_id' => $f['period']->id,
            'preferences' => [['kamar_id' => $f['room']->id]],
            'files' => [
                'perjanjian' => UploadedFile::fake()->create('perjanjian.pdf', 80, 'application/pdf'),
            ],
            'decision_kind' => 'full',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $second = ResidenceRegistration::where('student_profile_id', $f['profile']->id)
        ->where('status', 'submitted')
        ->sole();

    expect($second->id)->not->toBe($first->id)
        ->and($second->tagihan->nomor)->toBe('REG-2211523012-2');
});

it('aligns registration and invoice payment deadline to the track registration deadline and blocks registration after expiration', function () {
    $f = toBeFixture('local_non_kipk', 2);
    ResidenceRate::updateOrCreate([
        'gedung_id' => $f['building']->id,
        'tipe_kamar' => $f['room']->tipe_kamar,
        'unit' => 'year',
    ], ['amount' => 1000000]);
    $deadline = now()->addDays(5)->startOfMinute();
    $settings = $f['policy']->settings;
    unset($settings['rates']);
    $settings['registration_deadline'] = $deadline->toIso8601String();

    $this->actingAs($f['manager'])
        ->post(route('residence.policies'), [
            'category' => 'local_non_kipk',
            'settings' => $settings,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($f['user'])
        ->post(route('andalas.registrations.store'), [
            'periode_id' => $f['period']->id,
            'preferences' => [['kamar_id' => $f['room']->id]],
            'files' => [
                'perjanjian' => UploadedFile::fake()->create('perjanjian.pdf', 80, 'application/pdf'),
            ],
            'decision_kind' => 'full',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $registration = ResidenceRegistration::where('student_profile_id', $f['profile']->id)
        ->where('status', 'submitted')
        ->sole();

    expect($registration->reservation_expires_at?->timestamp)->toBe($deadline->timestamp)
        ->and($registration->tagihan->jatuh_tempo?->timestamp)->toBe($deadline->timestamp);

    $this->actingAs($f['user'])
        ->post(route('residence.cancel', $registration))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->travelTo($deadline->copy()->addMinute());

    $this->actingAs($f['user'])
        ->post(route('andalas.registrations.store'), [
            'periode_id' => $f['period']->id,
            'preferences' => [['kamar_id' => $f['room']->id]],
            'files' => [
                'perjanjian' => UploadedFile::fake()->create('perjanjian.pdf', 80, 'application/pdf'),
            ],
            'decision_kind' => 'full',
        ])
        ->assertSessionHasErrors();

    expect(ResidenceRegistration::where('student_profile_id', $f['profile']->id)->where('status', 'submitted')->count())->toBe(0);
});
