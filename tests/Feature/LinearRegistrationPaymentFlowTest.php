<?php

use App\Actions\Billing\ReconcileResidencePayment;
use App\Enums\TagihanStatus;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\PaymentBankAccount;
use App\Models\Pembayaran;
use App\Models\ResidencePaymentReference;
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
            ->where('initialUser.payment_menu_visible', false)
            ->where('registration.0.can_cancel', true)
            ->where('registration.0.payment_unlocked', false)
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
        ->assertSessionHasErrors('cancel');
});

it('restricts registration document review exclusively to assigned building facilitator and unlocks payment menu & detail page upon approval', function () {
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
    $this->actingAs($f['user'])
        ->post(route('residence.documents.upload', $reg), [
            'kind' => 'perjanjian',
            'file' => UploadedFile::fake()->create('perjanjian.pdf', 80, 'application/pdf'),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $doc = $reg->fresh()->documents()->sole();

    // Admin Layanan, Staff Admin, Superadmin, and other building facilitator are all forbidden
    foreach ([$f['manager'], $staffAdmin, $superAdmin, $otherFacilitator] as $unauthorized) {
        $this->actingAs($unauthorized)
            ->post(route('residence.documents.review', $doc), ['status' => 'valid'])
            ->assertForbidden();
    }

    // Before doc review: payment detail renders locked state and sidebar payment menu is hidden
    $this->actingAs($f['user'])
        ->get(route('mahasiswa.tagihan.show', $reg->tagihan_id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('mahasiswa/tagihan-detail')
            ->where('initialUser.payment_menu_visible', false)
            ->where('registration.payment_unlocked', false)
            ->where('payment_accounts.0.account_number', $account->account_number)
        );

    // Assigned building facilitator approves the document
    $this->actingAs($assignedFacilitator)
        ->post(route('residence.documents.review', $doc), ['status' => 'valid'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    // Now payment menu & payment detail upload are unlocked
    $this->actingAs($f['user'])
        ->get(route('mahasiswa.tagihan.show', $reg->tagihan_id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('initialUser.payment_menu_visible', true)
            ->where('registration.payment_unlocked', true)
        );

    // Student submits payment proof; status stays calon until Pengelola reconciles
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
        ->and($f['profile']->fresh()->status_huni)->toBe('calon');

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

    // Pengelola reconciles DPUB bank reference -> status_huni becomes aktif automatically
    $ref = ResidencePaymentReference::factory()->create([
        'recorded_by' => $f['manager']->id,
        'amount' => (float) $reg->tagihan->total,
    ]);
    app(ReconcileResidencePayment::class)->handle(
        $ref,
        [['tagihan_id' => $reg->tagihan_id, 'jumlah' => (float) $reg->tagihan->total, 'payment_proof_id' => $payment->id]],
        $f['manager'],
    );

    expect($f['profile']->fresh()->status_huni)->toBe('aktif')
        ->and($reg->fresh()->ready_at)->not->toBeNull();
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
