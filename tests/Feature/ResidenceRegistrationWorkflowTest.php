<?php

use App\Actions\Billing\PostPayment;
use App\Actions\Billing\ReconcileResidencePayment;
use App\Actions\Registration\CreateResidenceBilling;
use App\Actions\Registration\ReviewResidenceRegistration;
use App\Actions\Registration\SubmitResidenceRegistration;
use App\Enums\ClientProfileCategory;
use App\Enums\ResidenceRegistrationStatus;
use App\Enums\TagihanStatus;
use App\Jobs\GenerateBillingDocument;
use App\Models\Gedung;
use App\Models\InvoiceGroup;
use App\Models\Kamar;
use App\Models\KipkRecipient;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\Pembayaran;
use App\Models\PenempatanKamar;
use App\Models\Periode;
use App\Models\ResidencePaymentReference;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Models\User;
use App\Services\RoomReservations;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    $this->travelTo(now()->setDate(2026, 11, 5));
    Queue::fake();
    Notification::fake();
});

function registrationStudent(): array
{
    workflowTestPolicies();
    $user = User::factory()->student()->create(['gender' => 'perempuan'])->assignRole('mahasiswa');
    $profile = MahasiswaProfil::query()->create([
        'user_id' => $user->id,
        'barcode_code' => Str::uuid()->toString(), 'prodi_id' => workflowTestProgram(), 'angkatan' => '2025',
    ]);
    $periode = Periode::query()->create([
        'nama_periode' => '2026/2027',
        'status' => 'aktif',
        'tanggal_mulai' => '2026-08-01',
        'tanggal_selesai' => '2027-07-31',
    ]);

    withHousingIdentity($profile);
    return [$user, $profile, $periode];
}

function registrationRoom(int $capacity = 2, string $status = 'kosong'): Kamar
{
    $building = Gedung::query()->create(['kode_gedung' => Str::random(8), 'nama_gedung' => 'Asrama']);
    $floor = Lantai::query()->create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);

    $room = Kamar::query()->create([
        'lantai_id' => $floor->id,
        'nomor_kamar' => Str::random(6),
        'tipe_kamar' => 'standar',
        'kapasitas' => $capacity,
        'tarif_per_periode' => 1500000,
        'status' => $status,
    ]);
    workflowTestPolicies();

    return $room;
}

function registrationKipk(MahasiswaProfil $profile, Periode $periode, string $nim, int $cohort = 2027): void
{
    $profile->user->update(['client_profile_category' => ClientProfileCategory::LocalNonKipk, 'nim_nip' => $nim]);
    $profile->update(['angkatan' => (string) $cohort]);
    Periode::where('id', '!=', $periode->id)->update(['status' => 'nonaktif']);
    $periode->update(['status' => 'aktif', 'angkatan_maba' => $cohort]);
    KipkRecipient::create(['nim' => $nim, 'angkatan' => $cohort, 'nama' => $profile->user->nama]);
}

function registrationAdmin(string ...$permissions): User
{
    $user = User::factory()->create()->assignRole('admin_layanan');
    foreach ($permissions as $permission) {
        $user->givePermissionTo(Permission::findOrCreate($permission));
    }

    return $user;
}

it('submits a non KIPK registration with the selected ready room', function () {
    [$user, $profile, $periode] = registrationStudent();
    $firstRoom = registrationRoom();

    $response = $this->actingAs($user)->from('/mahasiswa/dashboard')->post(route('andalas.registrations.store'), [
        'periode_id' => $periode->id,
        'is_kipk' => false,
        'preferences' => [
            ['kamar_id' => $firstRoom->id],
        ],
    ]);

    $response->assertRedirect('/mahasiswa/dashboard')->assertSessionHasNoErrors();
    $registration = ResidenceRegistration::query()->where('student_profile_id', $profile->id)->firstOrFail();
    expect($registration->status)->toBe(ResidenceRegistrationStatus::Submitted)
        ->and($registration->roomPreferences->pluck('priority')->all())->toBe([1])
        ->and($registration->statusHistories)->toHaveCount(1);
});

it('requires preferences for non KIPK and skips them for KIPK', function () {
    [$user, $profile, $periode] = registrationStudent();

    $this->actingAs($user)->post(route('andalas.registrations.store'), [
        'periode_id' => $periode->id,
        'is_kipk' => false,
    ])->assertSessionHasErrors('preferences');

    [$kipkUser, $kipkProfile, $kipkPeriod] = registrationStudent();
    registrationKipk($kipkProfile, $kipkPeriod, '2799000001');

    $this->actingAs($kipkUser)->post(route('andalas.registrations.store'), [
        'periode_id' => $kipkPeriod->id,
        'is_kipk' => true,
        'preferences' => [['kamar_id' => registrationRoom()->id]],
    ])->assertSessionHasNoErrors();

    expect(ResidenceRegistration::query()->where('student_profile_id', $kipkProfile->id)->firstOrFail()->roomPreferences)->toBeEmpty();
});

it('releases the reserved bed and cancels the invoice when an administrator cancels a registration', function () {
    [$student, $profile, $periode] = registrationStudent();
    $room = registrationRoom(1);
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $periode->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => $room->id]],
    ]);
    $invoice = $registration->fresh()->tagihan;
    expect(app(RoomReservations::class)->count($room))->toBe(1);
    $reviewer = User::factory()->create();
    $reviewer->givePermissionTo(Permission::findOrCreate('registration.review'));

    $this->actingAs($reviewer)->patch(route('andalas.registrations.update', $registration), [
        'status' => ResidenceRegistrationStatus::Rejected->value,
        'notes' => 'Data kamar tidak sesuai',
    ])->assertSessionHasNoErrors();

    expect($registration->fresh()->status)->toBe(ResidenceRegistrationStatus::Rejected)
        ->and($registration->fresh()->reserved_room_id)->toBeNull()
        ->and($invoice->fresh()->status)->toBe(TagihanStatus::Batal)
        ->and(app(RoomReservations::class)->count($room))->toBe(0);

    [$other] = registrationStudent();
    $this->actingAs($other)->post(route('andalas.registrations.store'), [
        'periode_id' => $periode->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => $room->id]],
    ])->assertSessionHasNoErrors();
});

it('rejects KIPK placement when the chosen room is already full', function () {
    [$user, $profile, $periode] = registrationStudent();
    registrationKipk($profile, $periode, '2799000010');
    $room = registrationRoom(1);
    $other = registrationStudent()[1];
    PenempatanKamar::query()->create([
        'mahasiswa_id' => $other->id,
        'kamar_id' => $room->id,
        'periode_id' => $periode->id,
        'tanggal_mulai' => now()->toDateString(),
        'status' => 'aktif',
    ]);
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $periode->id, 'is_kipk' => true, 'preferences' => [],
    ]);
    $admin = registrationAdmin('registration.review');

    $this->actingAs($admin)->post(route('andalas.registrations.sponsor', $registration), [
        'sponsor_name' => 'KIP-K', 'kamar_id' => $room->id,
    ])->assertSessionHasErrors('sponsor_name');

    expect($registration->fresh()->completed_at)->toBeNull()
        ->and($registration->fresh()->reserved_room_id)->toBeNull();
    $this->assertDatabaseCount('penempatan_kamar', 1);
});

it('forbids registration review without permission', function () {
    [$student, $profile, $periode] = registrationStudent();
    $registration = ResidenceRegistration::factory()->create([
        'student_profile_id' => $profile->id,
        'periode_id' => $periode->id,
        'status' => ResidenceRegistrationStatus::Submitted,
    ]);

    $this->actingAs(User::factory()->create())->patch(route('andalas.registrations.update', $registration), [
        'status' => 'verified',
    ])->assertForbidden();
});

it('rejects KIPK placement into a building for a different gender', function () {
    [$student, $profile, $period] = registrationStudent();
    registrationKipk($profile, $period, '2799000011');
    $student->update(['gender' => 'laki_laki']);
    $room = registrationRoom();
    $room->lantai->gedung->update(['kode_gedung' => 'A']);
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $period->id, 'is_kipk' => true, 'preferences' => [],
    ]);
    $admin = registrationAdmin('registration.review');

    $this->actingAs($admin)->post(route('andalas.registrations.sponsor', $registration), [
        'sponsor_name' => 'KIP-K', 'kamar_id' => $room->id,
    ])->assertSessionHasErrors('sponsor_name');
    expect($registration->fresh()->completed_at)->toBeNull();
    $this->assertDatabaseCount('penempatan_kamar', 0);
});

it('rejects a full room on submission even when its stored availability is stale', function () {
    [$student, $profile, $period] = registrationStudent();
    $room = registrationRoom(1);
    $other = registrationStudent()[1];
    PenempatanKamar::create([
        'mahasiswa_id' => $other->id, 'kamar_id' => $room->id, 'periode_id' => $period->id,
        'tanggal_mulai' => now()->toDateString(), 'status' => 'aktif',
    ]);
    $this->actingAs($student)->post(route('andalas.registrations.store'), [
        'periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => $room->id]],
    ])->assertSessionHasErrors('preferences');
    $this->assertDatabaseMissing('residence_registrations', ['student_profile_id' => $profile->id]);
});

it('queues a payment receipt and activates occupancy only after physical checkin', function () {
    Queue::fake([GenerateBillingDocument::class]);
    [$user, $profile, $period] = registrationStudent();
    $room = registrationRoom();
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => $room->id]],
    ]);
    $invoice = $registration->fresh()->tagihan;

    app(PostPayment::class)->handle('REG-PAY', $profile->id, now()->toDateTimeString(), [
        ['tagihan_id' => $invoice->id, 'jumlah' => 1500000],
    ]);

    expect($registration->fresh()->completed_at)->toBeNull();
    workflowTestCheckin($registration);
    expect($profile->fresh()->status_huni)->toBe('aktif')
        ->and($registration->fresh()->placement->status)->toBe('aktif')
        ->and($profile->residenceHistories()->count())->toBe(1)
        ->and($registration->fresh()->completed_at)->not->toBeNull();
    Queue::assertPushed(GenerateBillingDocument::class,
        fn ($job) => $job->tagihanId === $invoice->id && $job->jenis === 'receipt');
});

it('automatically allocates KIPK without a fictitious sponsor or personal receipt', function () {
    [$user, $profile, $period] = registrationStudent();
    registrationKipk($profile, $period, '2799000012');
    $room = registrationRoom();
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, ['periode_id' => $period->id]);
    expect($registration->reserved_room_id)->toBe($room->id);
    workflowTestCheckin($registration);
    expect($profile->fresh()->status_huni)->toBe('aktif');
    expect($registration->fresh()->tagihan->total)->toBe('1500000.00');
    expect($registration->tagihan->total_dibayar)->toBe('0.00');
    expect($registration->tagihan->sponsor_total)->toBe('0.00');
    Queue::assertNotPushed(GenerateBillingDocument::class, fn ($job) => $job->jenis === 'receipt');
});

it('uses the room tariff once and prevents bypassing a known non KIPK category', function () {
    [$user, $profile, $period] = registrationStudent();
    $user->update(['client_profile_category' => ClientProfileCategory::LocalNonKipk]);
    $room = registrationRoom();

    $this->actingAs($user)->post(route('andalas.registrations.store'), [
        'periode_id' => $period->id, 'is_kipk' => true, 'preferences' => [['kamar_id' => $room->id]],
    ])->assertSessionHasNoErrors();

    $registration = ResidenceRegistration::where('student_profile_id', $profile->id)->sole();
    $invoice = app(CreateResidenceBilling::class)->handle($registration);
    expect($registration->is_kipk)->toBeFalse()->and($invoice->total)->toBe('1500000.00');
    $this->assertDatabaseCount('tagihan', 1);
});

it('refuses an administrator lowering the initial payment without a recorded decision', function () {
    [$user, $profile, $period] = registrationStudent();
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, ['periode_id' => $period->id, 'preferences' => [['kamar_id' => registrationRoom()->id]]]);
    $invoice = $registration->fresh()->tagihan;
    $this->actingAs(registrationAdmin('pembayaran.verify'))->put(route('andalas.invoices.settings', $invoice), ['amount_due_now' => 500000, 'bank' => 'BRI', 'nomor' => 'VA-INSTALLMENT-1', 'atas_nama' => 'Andalas Residence'])->assertSessionHasErrors('amount_due_now');
    expect($registration->fresh()->completed_at)->toBeNull();
    expect($invoice->fresh()->total_dibayar)->toBe('0.00');
});

it('rejects multiple room selections so the invoiced room is unambiguous', function () {
    [$user, $profile, $period] = registrationStudent();

    $this->actingAs($user)->post(route('andalas.registrations.store'), [
        'periode_id' => $period->id,
        'is_kipk' => false,
        'preferences' => [['kamar_id' => registrationRoom()->id], ['kamar_id' => registrationRoom()->id]],
    ])->assertSessionHasErrors('preferences');

    $this->assertDatabaseCount('tagihan', 0);
});

it('verifies invoice evidence once and rejects payment against another residents invoice', function () {
    Storage::fake('local');
    Queue::fake([GenerateBillingDocument::class]);
    [$user, $profile, $period] = registrationStudent();
    $user->givePermissionTo(Permission::findOrCreate('pembayaran.create'));
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => registrationRoom()->id]],
    ]);
    $invoice = $registration->fresh()->tagihan;
    $payload = [
        'tagihan_id' => $invoice->id,
        'jenis_pembayaran' => 'sewa_asrama',
        'nominal' => 1500000,
        'bukti_transfer' => UploadedFile::fake()->create('bukti.pdf', 10, 'application/pdf'),
    ];
    $other = registrationStudent()[0];
    $other->givePermissionTo(Permission::findOrCreate('pembayaran.create'));
    $this->actingAs($other)->post(route('andalas.pembayaran.store'), $payload)->assertSessionHasErrors('tagihan_id');
    $this->assertDatabaseCount('pembayaran', 0);

    $this->actingAs($user)->post(route('andalas.pembayaran.store'), [...$payload, 'nominal' => 500000])->assertSessionHasErrors('nominal');
    $this->actingAs($user)->post(route('andalas.pembayaran.store'), $payload)->assertSessionHasNoErrors();
    $payment = Pembayaran::where('tagihan_id', $invoice->id)->sole();
    expect($invoice->fresh()->total_dibayar)->toBe('0.00');

    $reviewer = User::factory()->create();
    $reviewer->givePermissionTo(Permission::findOrCreate('pembayaran.verify'));
    $this->actingAs($reviewer)->post(route('andalas.pembayaran.verify', $payment), ['status' => 'lunas'])->assertSessionHasErrors('status');
    $reference = ResidencePaymentReference::factory()->create(['amount' => 1500000]);
    $allocation = [['tagihan_id' => $invoice->id, 'jumlah' => 1500000, 'payment_proof_id' => $payment->id]];
    app(ReconcileResidencePayment::class)->handle($reference, $allocation, $reviewer);
    app(ReconcileResidencePayment::class)->handle($reference, $allocation, $reviewer);

    expect($invoice->fresh()->total_dibayar)->toBe('1500000.00')
        ->and($invoice->fresh()->status)->toBe(TagihanStatus::Lunas)
        ->and($payment->fresh()->status)->toBe('lunas');
    $this->actingAs($reviewer)->post(route('andalas.pembayaran.verify', $payment), ['status' => 'ditolak'])->assertSessionHasErrors('status');
});

it('allocates a combined invoice payment to the original invoice without duplicating the debt', function () {
    Queue::fake();
    [$user, $profile, $period] = registrationStudent();
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => registrationRoom()->id]],
    ]);
    $invoice = $registration->fresh()->tagihan;
    $admin = registrationAdmin('pembayaran.verify');

    $this->actingAs($admin)->post(route('andalas.invoice-groups.store'), [
        'nomor' => 'INV-GAB-1', 'payer_type' => 'personal', 'invoice_ids' => [$invoice->id],
        'recipient' => 'PT Contoh', 'institution' => 'Universitas Andalas', 'subject' => 'Sewa asrama',
        'bank' => 'BRI', 'account_number' => '123456', 'account_name' => 'Andalas Residence',
        'due_date' => now()->addDays(7)->toDateString(), 'signer' => 'Direktur',
    ])->assertSessionHasNoErrors();
    $group = InvoiceGroup::sole();

    $this->actingAs($admin)->post(route('andalas.invoice-groups.pay', $group), [
        'reference' => 'BANK-TRANSFER-1', 'allocations' => [['tagihan_id' => $invoice->id, 'jumlah' => 1500000]],
    ])->assertSessionHasErrors('reference');
    $reference = ResidencePaymentReference::factory()->create(['amount' => 1500000]);
    app(ReconcileResidencePayment::class)->handle($reference, [['tagihan_id' => $invoice->id, 'jumlah' => 1500000]], $admin);

    expect($invoice->fresh()->total_dibayar)->toBe('1500000.00')
        ->and($invoice->fresh()->status)->toBe(TagihanStatus::Lunas)
        ->and($registration->fresh()->completed_at)->toBeNull();
    $this->assertDatabaseCount('pembayaran_tagihan', 1);
});

it('stores both invoice signatories and the uploaded administration signature in the issued snapshot', function () {
    Queue::fake();
    Storage::fake('local');
    [$user, $profile, $period] = registrationStudent();
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => registrationRoom()->id]],
    ]);
    $admin = registrationAdmin('pembayaran.verify');
    $this->actingAs($admin)->post(route('andalas.invoice-groups.store'), [
        'nomor' => 'INV-TTD-1', 'payer_type' => 'personal', 'invoice_ids' => [$registration->fresh()->tagihan_id],
        'recipient' => 'Mitra', 'institution' => 'Universitas Andalas', 'subject' => 'Sewa asrama',
        'bank' => 'BRI', 'account_number' => '123456', 'account_name' => 'Andalas Residence',
        'due_date' => now()->addDays(7)->toDateString(), 'signer' => 'Pimpinan', 'administration_signer' => 'Petugas Administrasi',
        'administration_signature' => UploadedFile::fake()->image('administrasi.png'),
    ])->assertSessionHasNoErrors();
    $group = InvoiceGroup::sole();
    expect($group->snapshot['signer'])->toBe('Pimpinan');
    expect($group->snapshot['administration_signer'])->toBe('Petugas Administrasi');
    Storage::disk('local')->assertExists($group->snapshot['administration_signature_path']);
    expect(Storage::disk('local')->get($group->path))->toStartWith('%PDF-');
});

it('lets a rejected applicant correct and resubmit while keeping the cancelled invoice history', function () {
    [$user, $profile, $period] = registrationStudent();
    $user->update(['client_profile_category' => ClientProfileCategory::LocalNonKipk]);
    $payload = ['periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => registrationRoom()->id]]];
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, $payload);
    $oldInvoice = $registration->fresh()->tagihan;
    $reviewer = User::factory()->create();
    $reviewer->givePermissionTo(Permission::findOrCreate('registration.review'));
    app(ReviewResidenceRegistration::class)->handle($registration, $reviewer, ResidenceRegistrationStatus::Rejected, 'Perbaiki data');

    $this->actingAs($user)->post(route('andalas.registrations.store'), $payload)->assertSessionHasNoErrors();

    $resubmitted = ResidenceRegistration::where('student_profile_id', $profile->id)
        ->where('status', ResidenceRegistrationStatus::Submitted)->sole();
    expect($registration->fresh()->status)->toBe(ResidenceRegistrationStatus::Rejected)
        ->and($oldInvoice->fresh()->status)->toBe(TagihanStatus::Batal)
        ->and($resubmitted->tagihan_id)->not->toBe($oldInvoice->id);
    $this->assertDatabaseCount('residence_registrations', 2);
    $this->assertDatabaseCount('tagihan', 2);
});

it('rejects self service international sponsorship and requires the institutional workflow', function () {
    [$user, $profile, $period] = registrationStudent();
    $user->update(['client_profile_category' => ClientProfileCategory::InternationalFreeFacility]);
    $room = registrationRoom();
    $this->actingAs($user)->post(route('andalas.registrations.store'), ['periode_id' => $period->id, 'preferences' => [['kamar_id' => $room->id]], 'funding' => 'sponsor', 'sponsor_name' => 'Beasiswa Internasional'])->assertSessionHasErrors('periode_id');
    $this->assertDatabaseCount('tagihan', 0);
});

it('bills KIPK at the published tariff and records physical checkin before disbursement', function () {
    [$user, $profile, $period] = registrationStudent();
    registrationKipk($profile, $period, '2699000050', 2026);
    $room = registrationRoom();
    ResidenceRate::create(['gedung_id' => $room->lantai->gedung_id, 'tipe_kamar' => $room->tipe_kamar, 'unit' => 'year', 'amount' => 2500000]);
    workflowTestPolicies();
    $this->actingAs($user)->post(route('andalas.registrations.store'), ['periode_id' => $period->id])->assertRedirect()->assertSessionHasNoErrors();
    $registration = ResidenceRegistration::where('student_profile_id', $profile->id)->sole();
    expect($registration->funding)->toBe('personal');
    expect($registration->tagihan->total)->toBe('2500000.00');
    expect($registration->tagihan->sponsor_total)->toBe('0.00');
    expect($registration->completed_at)->toBeNull();
    workflowTestCheckin($registration);
    expect($registration->fresh()->placement->kamar_id)->toBe($room->id);
    expect($registration->tagihan->total_dibayar)->toBe('0.00');
});

it('protects allocation retry and leaves KIPK queued when no priced room is available', function () {
    [$user, $profile, $period] = registrationStudent();
    registrationKipk($profile, $period, '2699000051', 2026);
    $room = registrationRoom();
    $room->update(['tarif_per_periode' => 0]);
    workflowTestPolicies();
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, ['periode_id' => $period->id]);
    $url = route('residence.allocate', $registration);
    $this->post($url)->assertRedirect(route('login'));
    $this->actingAs($user)->post($url)->assertForbidden();
    $this->actingAs(registrationAdmin('registration.review'))->post($url)->assertRedirect()->assertSessionHasNoErrors();
    expect($registration->fresh()->reserved_room_id)->toBeNull();
    expect($registration->fresh()->tagihan_id)->toBeNull();
    $this->assertDatabaseCount('tagihan', 0);
});

it('retains the unpaid KIPK balance after a partial receipt without inventing a checkin', function () {
    [$user, $profile, $period] = registrationStudent();
    registrationKipk($profile, $period, '2699000052', 2026);
    registrationRoom();
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, ['periode_id' => $period->id]);
    $invoice = $registration->fresh()->tagihan;
    app(PostPayment::class)->handle('KIPK-FIRST', $profile->id, now()->toDateTimeString(), [['tagihan_id' => $invoice->id, 'jumlah' => 500000]]);
    expect($registration->fresh()->completed_at)->toBeNull();
    workflowTestCheckin($registration);
    expect($profile->fresh()->status_huni)->toBe('aktif');
    expect($invoice->fresh()->status)->toBe(TagihanStatus::Sebagian);
    expect($invoice->fresh()->total_dibayar)->toBe('500000.00');
});
