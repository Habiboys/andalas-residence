<?php

use App\Actions\Billing\PostPayment;
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
use App\Models\ResidenceRegistration;
use App\Models\User;
use App\Services\RoomReservations;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

function registrationStudent(): array
{
    $user = User::factory()->student()->create();
    $profile = MahasiswaProfil::query()->create([
        'user_id' => $user->id,
        'barcode_code' => Str::uuid()->toString(),
    ]);
    $periode = Periode::query()->create([
        'nama_periode' => '2026/2027',
        'status' => 'aktif',
        'tanggal_mulai' => '2026-08-01',
        'tanggal_selesai' => '2027-07-31',
    ]);

    return [$user, $profile, $periode];
}

function registrationRoom(int $capacity = 2, string $status = 'kosong'): Kamar
{
    $building = Gedung::query()->create(['kode_gedung' => Str::random(8), 'nama_gedung' => 'Asrama']);
    $floor = Lantai::query()->create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);

    return Kamar::query()->create([
        'lantai_id' => $floor->id,
        'nomor_kamar' => Str::random(6),
        'kapasitas' => $capacity,
        'tarif_per_periode' => 1500000,
        'status' => $status,
    ]);
}

function registrationKipk(MahasiswaProfil $profile, Periode $periode, string $nim): void
{
    $profile->user->update(['client_profile_category' => ClientProfileCategory::LocalNonKipk, 'nim_nip' => $nim]);
    $profile->update(['angkatan' => '2026']);
    Periode::where('id', '!=', $periode->id)->update(['status' => 'nonaktif']);
    $periode->update(['status' => 'aktif', 'angkatan_maba' => 2026]);
    KipkRecipient::create(['nim' => $nim, 'angkatan' => 2026, 'nama' => $profile->user->nama]);
}

function registrationAdmin(string ...$permissions): User
{
    $user = User::factory()->create();
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
    registrationKipk($kipkProfile, $kipkPeriod, '2699000001');

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
    registrationKipk($profile, $periode, '2699000010');
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
    ])->assertSessionHasErrors('kamar_id');

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
    registrationKipk($profile, $period, '2699000011');
    $student->update(['gender' => 'laki_laki']);
    $room = registrationRoom();
    $room->lantai->gedung->update(['kode_gedung' => 'A']);
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $period->id, 'is_kipk' => true, 'preferences' => [],
    ]);
    $admin = registrationAdmin('registration.review');

    $this->actingAs($admin)->post(route('andalas.registrations.sponsor', $registration), [
        'sponsor_name' => 'KIP-K', 'kamar_id' => $room->id,
    ])->assertSessionHasErrors('kamar_id');
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

it('activates occupancy and queues the residence receipt when the registration invoice is paid', function () {
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

    expect($profile->fresh()->status_huni)->toBe('aktif')
        ->and($registration->fresh()->placement->status)->toBe('aktif')
        ->and($profile->residenceHistories()->count())->toBe(1)
        ->and($registration->fresh()->completed_at)->not->toBeNull();
    Queue::assertPushed(GenerateBillingDocument::class,
        fn ($job) => $job->tagihanId === $invoice->id && $job->jenis === 'residence_receipt');
});

it('completes KIPK registration through administrator placement without a fictitious personal receipt', function () {
    Queue::fake([GenerateBillingDocument::class]);
    [$user, $profile, $period] = registrationStudent();
    registrationKipk($profile, $period, '2699000012');
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $period->id, 'is_kipk' => true, 'preferences' => [],
    ]);
    $room = registrationRoom();
    $admin = registrationAdmin('registration.review');

    $this->actingAs($admin)->post(route('andalas.registrations.sponsor', $registration), [
        'sponsor_name' => 'KIP-K', 'kamar_id' => $room->id,
    ])->assertSessionHasNoErrors();

    expect($profile->fresh()->status_huni)->toBe('aktif')
        ->and($registration->fresh()->completed_at)->not->toBeNull()
        ->and((float) $registration->fresh()->tagihan->total)->toBe(0.0)
        ->and((float) $registration->fresh()->tagihan->total_dibayar)->toBe(0.0)
        ->and($registration->fresh()->placement->kamar_id)->toBe($room->id);
    Queue::assertNotPushed(GenerateBillingDocument::class,
        fn ($job) => $job->jenis === 'residence_receipt');
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

it('activates a resident after the administrator sets the next amount and the student settles it', function () {
    [$user, $profile, $period] = registrationStudent();
    $user->givePermissionTo(Permission::findOrCreate('pembayaran.create'));
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => registrationRoom()->id]],
    ]);
    $invoice = $registration->fresh()->tagihan;
    $admin = registrationAdmin('pembayaran.verify');

    $this->actingAs($admin)->put(route('andalas.invoices.settings', $invoice), [
        'amount_due_now' => 500000, 'bank' => 'BRI', 'nomor' => 'VA-INSTALLMENT-1', 'atas_nama' => 'Andalas Residence',
    ])->assertSessionHasNoErrors();
    expect((float) $invoice->fresh()->amount_due_now)->toBe(500000.0);

    $this->actingAs($user)->post(route('andalas.pembayaran.store'), [
        'tagihan_id' => $invoice->id, 'jenis_pembayaran' => 'sewa_asrama', 'nominal' => 500000,
        'bukti_transfer' => UploadedFile::fake()->image('bukti.jpg'),
    ])->assertSessionHasNoErrors();
    $payment = Pembayaran::where('tagihan_id', $invoice->id)->sole();
    $this->actingAs($admin)->post(route('andalas.pembayaran.verify', $payment), ['status' => 'lunas'])->assertSessionHasNoErrors();

    expect($profile->fresh()->status_huni)->toBe('aktif')
        ->and($invoice->fresh()->total_dibayar)->toBe('500000.00')
        ->and($invoice->fresh()->status)->toBe(TagihanStatus::Sebagian);
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
    $this->actingAs($reviewer)->post(route('andalas.pembayaran.verify', $payment), ['status' => 'lunas'])->assertSessionHasNoErrors();
    $this->actingAs($reviewer)->post(route('andalas.pembayaran.verify', $payment), ['status' => 'lunas'])->assertSessionHasNoErrors();

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
    ])->assertSessionHasNoErrors();

    expect($invoice->fresh()->total_dibayar)->toBe('1500000.00')
        ->and($invoice->fresh()->status)->toBe(TagihanStatus::Lunas)
        ->and($profile->fresh()->status_huni)->toBe('aktif');
    $this->assertDatabaseCount('pembayaran_tagihan', 1);
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

it('completes an international registration once an administrator approves the payer', function () {
    Queue::fake([GenerateBillingDocument::class]);
    [$user, $profile, $period] = registrationStudent();
    $user->update(['client_profile_category' => ClientProfileCategory::InternationalFreeFacility]);
    $room = registrationRoom();
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => $room->id]],
        'funding' => 'sponsor', 'sponsor_name' => 'Beasiswa Internasional',
    ]);
    expect($registration->fresh()->completed_at)->toBeNull();

    $admin = registrationAdmin('registration.review');
    $this->actingAs($admin)->post(route('andalas.registrations.sponsor', $registration), [
        'sponsor_name' => 'Beasiswa Internasional', 'kamar_id' => $room->id,
    ])->assertSessionHasNoErrors();

    expect($registration->fresh()->completed_at)->not->toBeNull()
        ->and($profile->fresh()->status_huni)->toBe('aktif')
        ->and((float) $registration->fresh()->tagihan->total)->toBe(0.0)
        ->and((float) $registration->fresh()->tagihan->sponsor_total)->toBe(1500000.0)
        ->and((float) $registration->fresh()->tagihan->sponsor_paid)->toBe(0.0)
        ->and($registration->fresh()->placement->kamar_id)->toBe($room->id);
    Queue::assertNotPushed(GenerateBillingDocument::class, fn ($job) => $job->jenis === 'residence_receipt');
});
