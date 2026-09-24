<?php

use App\Actions\Billing\PostPayment;
use App\Actions\Registration\CompleteResidenceRegistration;
use App\Actions\Registration\CreateResidenceBilling;
use App\Actions\Registration\ReviewResidenceRegistration;
use App\Actions\Registration\SubmitResidenceRegistration;
use App\Enums\ClientProfileCategory;
use App\Enums\ResidenceRegistrationStatus;
use App\Enums\TagihanStatus;
use App\Jobs\GenerateBillingDocument;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\Pembayaran;
use App\Models\PenempatanKamar;
use App\Models\Periode;
use App\Models\ResidenceRegistration;
use App\Models\User;
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

    $this->actingAs($user)->post(route('andalas.registrations.store'), [
        'periode_id' => $periode->id,
        'is_kipk' => true,
        'preferences' => [['kamar_id' => registrationRoom()->id]],
    ])->assertSessionHasNoErrors();

    expect(ResidenceRegistration::query()->where('student_profile_id', $profile->id)->firstOrFail()->roomPreferences)->toBeEmpty();
});

it('reviews registration through valid transitions and keeps an accepted student awaiting payment', function () {
    [$student, $profile, $periode] = registrationStudent();
    $room = registrationRoom(1);
    $registration = ResidenceRegistration::factory()->create([
        'student_profile_id' => $profile->id,
        'periode_id' => $periode->id,
        'status' => ResidenceRegistrationStatus::Submitted,
        'submitted_at' => now(),
    ]);
    $registration->roomPreferences()->create(['kamar_id' => $room->id, 'priority' => 1]);
    $reviewer = User::factory()->create();
    $reviewer->givePermissionTo(Permission::findOrCreate('registration.review'));

    $this->actingAs($reviewer)->patch(route('andalas.registrations.update', $registration), [
        'status' => ResidenceRegistrationStatus::Verified->value,
    ])->assertSessionHasNoErrors();
    $this->actingAs($reviewer)->patch(route('andalas.registrations.update', $registration), [
        'status' => ResidenceRegistrationStatus::Accepted->value,
        'kamar_id' => $room->id,
    ])->assertSessionHasNoErrors();

    expect($registration->fresh()->status)->toBe(ResidenceRegistrationStatus::Accepted)
        ->and($registration->statusHistories()->count())->toBe(2)
        ->and(PenempatanKamar::query()->where('mahasiswa_id', $profile->id)->where('status', 'aktif')->count())->toBe(1)
        ->and($registration->fresh()->completed_at)->toBeNull()
        ->and($room->fresh()->status)->toBe('penuh');
});

it('rejects placement when room capacity or one-active-placement invariant is violated', function () {
    [$student, $profile, $periode] = registrationStudent();
    $room = registrationRoom(1);
    $other = registrationStudent()[1];
    PenempatanKamar::query()->create([
        'mahasiswa_id' => $other->id,
        'kamar_id' => $room->id,
        'periode_id' => $periode->id,
        'tanggal_mulai' => now()->toDateString(),
        'status' => 'aktif',
    ]);
    $registration = ResidenceRegistration::factory()->create([
        'student_profile_id' => $profile->id,
        'periode_id' => $periode->id,
        'status' => ResidenceRegistrationStatus::Verified,
    ]);
    $registration->roomPreferences()->create(['kamar_id' => $room->id, 'priority' => 1]);
    $reviewer = User::factory()->create();
    $reviewer->givePermissionTo(Permission::findOrCreate('registration.review'));

    $this->actingAs($reviewer)->patch(route('andalas.registrations.update', $registration), [
        'status' => 'accepted',
        'kamar_id' => $room->id,
    ])->assertSessionHasErrors('kamar_id');

    expect($registration->fresh()->status)->toBe(ResidenceRegistrationStatus::Verified)
        ->and($registration->fresh()->penempatan_kamar_id)->toBeNull();
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

it('activates occupancy and queues the residence receipt when the registration invoice is paid', function () {
    Queue::fake([GenerateBillingDocument::class]);
    [$user, $profile, $period] = registrationStudent();
    $room = registrationRoom();
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => $room->id]],
    ]);
    $reviewer = User::factory()->create();
    $review = app(ReviewResidenceRegistration::class);
    $review->handle($registration, $reviewer, ResidenceRegistrationStatus::Verified);
    $review->handle($registration, $reviewer, ResidenceRegistrationStatus::Accepted, roomId: $room->id);
    $invoice = $registration->fresh()->tagihan;

    app(PostPayment::class)->handle('REG-PAY', $profile->id, now()->toDateTimeString(), [
        ['tagihan_id' => $invoice->id, 'jumlah' => 1500000],
    ]);
    app(CompleteResidenceRegistration::class)->handle($registration);

    expect($profile->fresh()->status_huni)->toBe('aktif')
        ->and($registration->fresh()->placement->status)->toBe('aktif')
        ->and($profile->residenceHistories()->count())->toBe(1)
        ->and($registration->fresh()->completed_at)->not->toBeNull();
    Queue::assertPushed(GenerateBillingDocument::class,
        fn ($job) => $job->tagihanId === $invoice->id && $job->jenis === 'residence_receipt');
});

it('completes KIPK registration without a second checkin or payment', function () {
    Queue::fake([GenerateBillingDocument::class]);
    [$user, $profile, $period] = registrationStudent();
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $period->id, 'is_kipk' => true, 'preferences' => [],
    ]);
    $reviewer = User::factory()->create();
    $review = app(ReviewResidenceRegistration::class);
    $review->handle($registration, $reviewer, ResidenceRegistrationStatus::Verified);

    $review->handle($registration, $reviewer, ResidenceRegistrationStatus::Accepted, roomId: registrationRoom()->id);

    expect($profile->fresh()->status_huni)->toBe('aktif')
        ->and($registration->fresh()->tagihan->total)->toBe('0.00');
    Queue::assertPushed(GenerateBillingDocument::class, fn ($job) => $job->jenis === 'residence_receipt');
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

it('activates an accepted resident after the approved first installment while preserving the debt', function () {
    [$user, $profile, $period] = registrationStudent();
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => registrationRoom()->id]],
    ]);
    $invoice = $registration->fresh()->tagihan;
    $reviewer = User::factory()->create();
    $reviewer->givePermissionTo(Permission::findOrCreate('pembayaran.verify'));

    $this->actingAs($reviewer)->put(route('andalas.tagihan.installments', $invoice), [
        'cicilan' => [['jumlah' => 500000, 'jatuh_tempo' => now()->toDateString()], ['jumlah' => 1000000, 'jatuh_tempo' => now()->addMonth()->toDateString()]],
    ])->assertSessionHasNoErrors();
    $review = app(ReviewResidenceRegistration::class);
    $review->handle($registration, $reviewer, ResidenceRegistrationStatus::Verified);
    $review->handle($registration, $reviewer, ResidenceRegistrationStatus::Accepted, roomId: $registration->roomPreferences()->first()->kamar_id);
    app(PostPayment::class)->handle('INSTALLMENT-1', $profile->id, now()->toDateTimeString(), [['tagihan_id' => $invoice->id, 'jumlah' => 500000]]);

    expect($profile->fresh()->status_huni)->toBe('aktif')->and($invoice->fresh()->total_dibayar)->toBe('500000.00')
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

it('routes a residents installment request to admin and rejects foreign requests', function () {
    [$user, $profile, $period] = registrationStudent();
    $user->givePermissionTo(Permission::findOrCreate('pembayaran.create'));
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => registrationRoom()->id]],
    ]);
    $invoice = $registration->fresh()->tagihan;

    $this->actingAs($user)->post(route('andalas.tagihan.request-installments', $invoice), ['alasan' => 'Menunggu pembayaran beasiswa'])
        ->assertSessionHasNoErrors();
    expect($invoice->fresh()->alasan_cicilan)->toBe('Menunggu pembayaran beasiswa')
        ->and($invoice->fresh()->cicilan_diminta_at)->not->toBeNull()
        ->and($invoice->fresh()->total)->toBe('1500000.00');

    $other = registrationStudent()[0];
    $other->givePermissionTo(Permission::findOrCreate('pembayaran.create'));
    $this->actingAs($other)->post(route('andalas.tagihan.request-installments', $invoice), ['alasan' => 'Mengubah milik orang lain'])->assertForbidden();
});

it('lets a rejected applicant correct and resubmit while keeping the cancelled invoice history', function () {
    [$user, $profile, $period] = registrationStudent();
    $user->update(['client_profile_category' => ClientProfileCategory::LocalNonKipk]);
    $payload = ['periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => registrationRoom()->id]]];
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, $payload);
    $oldInvoice = $registration->fresh()->tagihan;
    app(ReviewResidenceRegistration::class)->handle($registration, User::factory()->create(), ResidenceRegistrationStatus::Rejected, 'Perbaiki data');

    $this->actingAs($user)->post(route('andalas.registrations.store'), $payload)->assertSessionHasNoErrors();

    expect($registration->fresh()->status)->toBe(ResidenceRegistrationStatus::Submitted)
        ->and($oldInvoice->fresh()->status)->toBe(TagihanStatus::Batal)
        ->and($registration->fresh()->tagihan_id)->not->toBe($oldInvoice->id);
    $this->assertDatabaseCount('residence_registrations', 1);
    $this->assertDatabaseCount('tagihan', 2);
});

it('completes an eligible international free facility registration without payment', function () {
    Queue::fake([GenerateBillingDocument::class]);
    [$user, $profile, $period] = registrationStudent();
    $user->update(['client_profile_category' => ClientProfileCategory::InternationalFreeFacility]);
    $room = registrationRoom();
    $registration = app(SubmitResidenceRegistration::class)->handle($profile, [
        'periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => $room->id]],
    ]);
    $reviewer = User::factory()->create();
    $review = app(ReviewResidenceRegistration::class);
    $review->handle($registration, $reviewer, ResidenceRegistrationStatus::Verified);
    $review->handle($registration, $reviewer, ResidenceRegistrationStatus::Accepted, roomId: $room->id);

    expect($registration->fresh()->tagihan->total)->toBe('0.00')
        ->and($profile->fresh()->status_huni)->toBe('aktif')
        ->and($registration->fresh()->placement->kamar_id)->toBe($room->id);
    Queue::assertPushed(GenerateBillingDocument::class, fn ($job) => $job->jenis === 'residence_receipt');
});
