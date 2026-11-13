<?php

use App\Actions\Billing\ReconcileResidencePayment;
use App\Actions\Checkout\EndTemporaryStays;
use App\Actions\Registration\AllocateResidenceRoom;
use App\Actions\Registration\ConfirmResidenceCheckIn;
use App\Actions\Registration\SubmitResidenceRegistration;
use App\Models\City;
use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\Province;
use App\Models\RegistrationDocument;
use App\Models\ResidenceApplication;
use App\Models\ResidenceDecision;
use App\Models\ResidenceDocumentTemplate;
use App\Models\ResidencePaymentReference;
use App\Models\ResidencePolicy;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Models\RoomInvitation;
use App\Models\RoomType;
use App\Models\TransaksiKeuangan;
use App\Models\User;
use App\Notifications\ResidenceWorkflowNotification;
use App\Services\ResidenceWorkflow;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo(now()->setDate(2026, 11, 5)->startOfDay());
    $this->withoutVite();
    Queue::fake();
    Notification::fake();
    Storage::fake('local');
});

it('blocks new registrations until a complete category policy is published', function () {
    $f = toBeFixture();
    $f['policy']->delete();
    $this->actingAs($f['user'])->post(route('andalas.registrations.store'), ['periode_id' => $f['period']->id, 'preferences' => [['kamar_id' => $f['room']->id]]])->assertSessionHasErrors('policy');
    $this->assertDatabaseCount('residence_registrations', 0);
});

it('completes an SSO profile without changing identity or roles and rejects incomplete submission', function () {
    $f = toBeFixture();
    $f['profile']->update(['prodi_id' => null]);
    $f['user']->update(['gender' => null]);
    $this->actingAs($f['user'])->post(route('andalas.registrations.store'), ['periode_id' => $f['period']->id, 'preferences' => [['kamar_id' => $f['room']->id]]])->assertSessionHasErrors('profile');
    $this->post(route('residence.profile'), ['gender' => 'perempuan', 'prodi_id' => $f['program']->id, 'role' => 'pimpinan', 'nim_nip' => '2099000000'])->assertRedirect()->assertSessionHasNoErrors();
    expect($f['profile']->fresh()->prodi_id)->toBe($f['program']->id);
    expect($f['user']->fresh()->nim_nip)->toBe($f['user']->nim_nip);
    expect($f['user']->fresh()->getRoleNames()->all())->toBe(['mahasiswa']);
});

it('keeps payment separate from occupancy and records physical checkin exactly once', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    toBeDocument($r, $f['manager']);
    toBePay($r, $f['manager']);
    expect($r->fresh()->ready_at)->not->toBeNull();
    expect($r->fresh()->completed_at)->toBeNull();
    $this->assertDatabaseCount('penempatan_kamar', 0);
    $body = ['identity_checked' => 1, 'original_documents_checked' => 1, 'keys_handed' => 1];
    $this->actingAs($f['manager'])->post(route('residence.checkin', $r), $body)->assertRedirect()->assertSessionHasNoErrors();
    $this->post(route('residence.checkin', $r), $body)->assertRedirect()->assertSessionHasNoErrors();
    expect($r->fresh()->checked_in_by)->toBe($f['manager']->id);
    expect($f['profile']->fresh()->status_huni)->toBe('aktif');
    $this->assertDatabaseCount('penempatan_kamar', 1);
    $this->assertDatabaseCount('residence_histories', 1);
    Notification::assertSentTo($f['user'], ResidenceWorkflowNotification::class, fn ($n) => $n->subject === 'Siap check-in');
});

it('denies checkin when required documents are missing and physical confirmations are absent', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    toBePay($r, $f['manager']);
    $this->actingAs($f['manager'])->post(route('residence.checkin', $r), ['identity_checked' => 1, 'original_documents_checked' => 1, 'keys_handed' => 1])->assertSessionHasErrors('checkin');
    $this->post(route('residence.checkin', $r))->assertSessionHasErrors('keys_handed');
    $this->assertDatabaseCount('penempatan_kamar', 0);
});

it('allocates KIPK automatically and permits checkin before disbursement with a valid agreement', function () {
    $f = toBeFixture('local_kipk');
    $r = toBeSubmit($f);
    toBeDocument($r, $f['manager']);
    expect($r->reserved_room_id)->toBe($f['room']->id);
    expect($r->funding)->toBe('personal');
    expect((float) $r->tagihan->sponsor_total)->toBe(0.0);
    app(ConfirmResidenceCheckIn::class)->handle($r, $f['manager']);
    expect($r->fresh()->completed_at)->not->toBeNull();
    expect((float) $r->tagihan->total_dibayar)->toBe(0.0);
});

it('waitlists KIPK without an invoice when rooms are full and allocates once after capacity returns', function () {
    $f = toBeFixture('local_kipk', 1);
    $f['room']->update(['status' => 'maintenance']);
    $r = toBeSubmit($f);
    expect($r->allocation_status)->toBe('waiting');
    expect($r->tagihan_id)->toBeNull();
    $f['room']->update(['status' => 'kosong']);
    app(AllocateResidenceRoom::class)->handle($r);
    app(AllocateResidenceRoom::class)->handle($r);
    expect($r->fresh()->reserved_room_id)->toBe($f['room']->id);
    $this->assertDatabaseCount('tagihan', 1);
});

it('records disbursement and a due date without posting imaginary payments', function () {
    $f = toBeFixture('local_kipk');
    $r = toBeSubmit($f);
    $this->actingAs($f['manager'])->post(route('residence.disburse', $r), ['disbursed_at' => today()->toDateString(), 'due_at' => today()->addDays(7)->toDateString(), 'reference' => 'KIP-001'])->assertRedirect()->assertSessionHasNoErrors();
    expect($r->fresh()->kipk_disbursed_at)->not->toBeNull();
    expect($r->fresh()->tagihan->jatuh_tempo->toDateString())->toBe('2026-11-12');
    $this->assertDatabaseCount('pembayaran_tagihan', 0);
});

it('keeps old policy rates unchanged when a new version is published', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    $settings = $f['policy']->settings;
    unset($settings['rates']);
    ResidenceRate::updateOrCreate([
        'gedung_id' => $f['room']->lantai->gedung_id,
        'tipe_kamar' => $f['room']->tipe_kamar,
        'unit' => 'year',
    ], ['amount' => 2000000]);
    $this->actingAs($f['manager'])->post(route('residence.policies'), ['category' => 'local_non_kipk', 'settings' => $settings])->assertRedirect()->assertSessionHasNoErrors();
    expect(ResidencePolicy::where('category', 'local_non_kipk')->count())->toBe(2);
    expect((float) ResidencePolicy::where('category', 'local_non_kipk')->latest('version')->firstOrFail()->settings['rates'][0]['amount'])->toBe(2000000.0);
    expect($r->fresh()->residence_policy_id)->toBe($f['policy']->id);
    expect((float) $r->tagihan->total)->toBe(1000000.0);
});

it('rejects incomplete publication and publication by a student', function () {
    $f = toBeFixture();
    $settings = $f['policy']->settings;
    unset($settings['rates']);
    ResidenceRate::where('gedung_id', $f['room']->lantai->gedung_id)->delete();
    $this->actingAs($f['manager'])->post(route('residence.policies'), ['category' => 'local_non_kipk', 'settings' => $settings])->assertSessionHasErrors('settings.building_ids');
    $this->actingAs($f['user'])->post(route('residence.policies'), ['category' => 'local_non_kipk', 'settings' => $f['policy']->settings])->assertForbidden();
    $this->assertDatabaseCount('residence_policies', 1);
});

it('stores document revisions privately and prevents cross-student access', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    $other = User::factory()->create()->assignRole('mahasiswa');
    $this->actingAs($f['user'])->post(route('residence.documents.upload', $r), ['kind' => 'perjanjian', 'file' => UploadedFile::fake()->create('agreement.pdf', 15, 'application/pdf')])->assertRedirect()->assertSessionHasNoErrors();
    $document = $r->documents()->sole();
    Storage::disk('local')->assertExists($document->path);
    $this->actingAs($other)->get(route('residence.documents.download', $document))->assertForbidden();
    $this->post(route('residence.documents.upload', $r), ['kind' => 'perjanjian', 'file' => UploadedFile::fake()->create('other.pdf', 15, 'application/pdf')])->assertForbidden();
    $this->actingAs($f['manager'])->post(route('residence.documents.review', $document), ['status' => 'revision', 'notes' => 'Tanda tangan belum ada'])->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($f['user'])->post(route('residence.documents.upload', $r), ['kind' => 'perjanjian', 'file' => UploadedFile::fake()->create('signed.pdf', 15, 'application/pdf')])->assertRedirect()->assertSessionHasNoErrors();
    expect($r->documents()->count())->toBe(2);
    $this->actingAs($f['manager'])->post(route('residence.documents.review', $document), ['status' => 'valid'])->assertSessionHasErrors('document');
});

it('requires and saves identity and address on the housing data page', function () {
    $f = toBeFixture();
    $f['profile']->update(['nik' => null, 'city_id' => null, 'alamat' => null]);
    $this->actingAs($f['user'])->post(route('andalas.registrations.store'), [
        'periode_id' => $f['period']->id,
        'preferences' => [['kamar_id' => $f['room']->id]],
    ])->assertSessionHasErrors('profile');
    $province = Province::create(['name' => 'Provinsi Uji', 'wilayah_code' => '98']);
    $city = City::create(['name' => 'Kota Uji', 'province_id' => $province->id, 'wilayah_code' => '98.99']);
    $url = route('residence.housing-profile');
    $base = ['gender' => 'perempuan', 'prodi_id' => $f['program']->id, 'no_hp' => '080000000001'];
    $this->actingAs($f['user'])->post($url, $base)->assertSessionHasErrors(['nama', 'nik', 'city_id', 'alamat']);

    $this->post($url, [...$base, 'nama' => 'Nama Resmi Uji', 'nik' => '9999999999999999',
        'city_id' => $city->id, 'alamat' => 'Jalan Uji 1'])
        ->assertSessionHasNoErrors()->assertRedirect(route('mahasiswa.registration'));
    expect($f['user']->fresh()->nama)->toBe('Nama Resmi Uji');
    expect($f['profile']->fresh()->alamat)->toBe('Jalan Uji 1');
    $this->post(route('andalas.registrations.store'), [
        'periode_id' => $f['period']->id,
        'preferences' => [['kamar_id' => $f['room']->id]],
    ])->assertSessionHasNoErrors();
});

it('denies checkin to facilitators assigned to another building', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    toBeDocument($r, $f['manager']);
    toBePay($r, $f['manager']);
    $facilitator = toBeOfficer('fasilitator');
    $this->actingAs($facilitator)->post(route('residence.checkin', $r), ['identity_checked' => 1, 'original_documents_checked' => 1, 'keys_handed' => 1])->assertForbidden();
    $this->assertDatabaseCount('penempatan_kamar', 0);
});

it('requires a leader for a zero-upfront deferral and preserves the debt after approval', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    toBeDocument($r, $f['manager']);
    $this->actingAs($f['user'])->post(route('residence.decisions.request', $r), ['kind' => 'defer', 'reason' => 'Menunggu dana'])->assertRedirect()->assertSessionHasNoErrors();
    $decision = $r->decisions()->sole();
    $body = ['status' => 'approved', 'notes' => 'Disetujui sesuai perjanjian', 'initial_amount' => 0, 'schedule' => [['jumlah' => 1000000, 'jatuh_tempo' => '2026-12-01']]];
    $this->actingAs($f['manager'])->post(route('residence.decisions.review', $decision), $body)->assertForbidden();
    $leader = toBeOfficer('pimpinan');
    $this->actingAs($leader)->post(route('residence.decisions.review', $decision), $body)->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($f['manager'])->post(route('residence.decisions.review', $decision), $body)->assertRedirect()->assertSessionHasNoErrors();
    RegistrationDocument::factory()->create(['residence_registration_id' => $r->id, 'kind' => $decision->fresh()->terms['agreement_kind'], 'status' => 'valid', 'reviewed_by' => $f['manager']->id, 'reviewed_at' => now()]);
    app(ResidenceWorkflow::class)->evaluate($r->fresh());
    expect($r->fresh()->ready_at)->not->toBeNull();
    expect((float) $r->tagihan->total_dibayar)->toBe(0.0);
    expect($decision->fresh()->decided_by)->toBe($leader->id);
});

it('keeps a rejected installment application on the regular payment requirement', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    toBeDocument($r, $f['manager']);
    $decision = ResidenceDecision::factory()->create(['residence_registration_id' => $r->id, 'kind' => 'installment']);
    $this->actingAs(toBeOfficer('pimpinan'))->post(route('residence.decisions.review', $decision), ['status' => 'rejected', 'notes' => 'Bayar reguler'])->assertRedirect()->assertSessionHasNoErrors();
    expect(app(ResidenceWorkflow::class)->financiallyReady($r->fresh()))->toBeFalse();
});

it('requires the approved first installment without forgiving the remaining balance', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    toBeDocument($r, $f['manager']);
    $decision = ResidenceDecision::factory()->create(['residence_registration_id' => $r->id, 'kind' => 'installment']);
    $this->actingAs(toBeOfficer('pimpinan'))->post(route('residence.decisions.review', $decision), ['status' => 'approved', 'notes' => 'Dua termin', 'initial_amount' => 400000, 'schedule' => [['jumlah' => 400000, 'jatuh_tempo' => '2026-11-05'], ['jumlah' => 600000, 'jatuh_tempo' => '2026-12-05']]])->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($f['manager'])->post(route('residence.decisions.review', $decision), ['status' => 'approved', 'notes' => 'Dua termin', 'initial_amount' => 400000, 'schedule' => [['jumlah' => 400000, 'jatuh_tempo' => '2026-11-05'], ['jumlah' => 600000, 'jatuh_tempo' => '2026-12-05']]])->assertRedirect()->assertSessionHasNoErrors();
    RegistrationDocument::factory()->create(['residence_registration_id' => $r->id, 'kind' => $decision->fresh()->terms['agreement_kind'], 'status' => 'valid', 'reviewed_by' => $f['manager']->id, 'reviewed_at' => now()]);
    toBePay($r, $f['manager'], 400000);
    expect($r->fresh()->ready_at)->not->toBeNull();
    expect($r->fresh()->tagihan->status->value)->toBe('sebagian');
});

it('rejects manipulated monthly registration by a new intake student', function () {
    $f = toBeFixture();
    $f['profile']->update(['angkatan' => '2026']);
    $this->actingAs($f['user'])->post(route('andalas.registrations.store'), ['periode_id' => $f['period']->id, 'preferences' => [['kamar_id' => $f['room']->id]], 'rate_unit' => 'month', 'starts_at' => '2026-11-05', 'ends_at' => '2026-12-05'])->assertSessionHasErrors('rate_unit');
    $this->assertDatabaseCount('residence_registrations', 0);
});

it('requires a manager decision and positive first month for monthly registration', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f, ['rate_unit' => 'month', 'starts_at' => '2026-11-05', 'ends_at' => '2027-01-04']);
    toBeDocument($r, $f['manager']);
    $decision = ResidenceDecision::factory()->create(['residence_registration_id' => $r->id, 'kind' => 'monthly']);
    $body = ['status' => 'approved', 'notes' => 'Non-maba', 'initial_amount' => 0, 'schedule' => [['jumlah' => 100000, 'jatuh_tempo' => '2026-11-05'], ['jumlah' => 100000, 'jatuh_tempo' => '2026-12-05']]];
    $this->actingAs($f['manager'])->post(route('residence.decisions.review', $decision), $body)->assertSessionHasErrors('initial_amount');
    $this->post(route('residence.decisions.review', $decision), [...$body, 'initial_amount' => 100000])->assertRedirect()->assertSessionHasNoErrors();
    toBePay($r, $f['manager'], 100000);
    expect($r->fresh()->ready_at)->not->toBeNull();
});

it('prevents administrators from bypassing financing approval by editing a VA amount', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    $this->actingAs($f['manager'])->put(route('andalas.invoices.settings', $r->tagihan_id), ['amount_due_now' => 1, 'bank' => 'BNI', 'nomor' => '123456789', 'atas_nama' => 'Uji'])->assertSessionHasErrors('amount_due_now');
    expect($r->tagihan->fresh()->amount_due_now)->toBeNull();
});

it('does not reserve the same final bed for a second applicant', function () {
    $f = toBeFixture(capacity: 1);
    toBeSubmit($f);
    $user = User::factory()->student()->create(['gender' => 'perempuan']);
    $profile = MahasiswaProfil::create(['user_id' => $user->id, 'prodi_id' => $f['program']->id, 'angkatan' => '2025', 'barcode_code' => fake()->uuid()]);
    expect(fn () => app(SubmitResidenceRegistration::class)->handle($profile, ['periode_id' => $f['period']->id, 'preferences' => [['kamar_id' => $f['room']->id]]]))->toThrow(ValidationException::class);
    $this->assertDatabaseCount('residence_registrations', 1);
    $this->assertDatabaseCount('tagihan', 1);
});

it('splits a ten million room contract into two five million invoices after consent', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f, ['billing_basis' => 'room']);
    $invitee = User::factory()->student()->create(['gender' => 'perempuan'])->assignRole('mahasiswa');
    MahasiswaProfil::create(['user_id' => $invitee->id, 'prodi_id' => $f['program']->id, 'angkatan' => '2025', 'barcode_code' => fake()->uuid()]);
    $this->actingAs($f['user'])->post(route('andalas.room-invitations.store'), ['registration_id' => $r->id, 'nim' => $invitee->nim_nip])->assertRedirect()->assertSessionHasNoErrors();
    $invitation = RoomInvitation::sole();
    $this->actingAs($invitee)->put(route('andalas.room-invitations.update', $invitation), ['accept' => true])->assertRedirect()->assertSessionHasNoErrors();
    $member = ResidenceRegistration::where('student_profile_id', $invitee->mahasiswaProfil->id)->sole();
    $this->actingAs($f['manager'])->post(route('residence.contracts'), ['registration_ids' => [$r->id, $member->id]])->assertRedirect()->assertSessionHasNoErrors();
    expect((float) $r->fresh()->tagihan->total)->toBe(5000000.0);
    expect((float) $member->fresh()->tagihan->total)->toBe(5000000.0);
    $this->assertDatabaseCount('room_contracts', 1);
});

it('posts a DPUB receipt once and rejects reused references with different allocations', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    $reference = toBePay($r, $f['manager']);
    $this->actingAs($f['manager'])->post(route('residence.payments.match', $reference), ['allocations' => [['tagihan_id' => $r->tagihan_id, 'jumlah' => 1000000]]])->assertRedirect()->assertSessionHasNoErrors();
    $this->post(route('residence.payments.match', $reference), ['allocations' => [['tagihan_id' => $r->tagihan_id, 'jumlah' => 1]]])->assertSessionHasErrors('reference');
    $this->assertDatabaseCount('transaksi_keuangan', 1);
    $this->assertDatabaseCount('pembayaran_tagihan', 1);
    expect((float) TransaksiKeuangan::sole()->nominal)->toBe(1000000.0);
});

it('keeps mismatched DPUB transactions in the exception queue without posting money', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    $reference = ResidencePaymentReference::factory()->create(['amount' => 900000]);
    $this->actingAs($f['manager'])->post(route('residence.payments.match', $reference), ['allocations' => [['tagihan_id' => $r->tagihan_id, 'jumlah' => 1000000]]])->assertSessionHasErrors('allocations');
    expect($reference->fresh()->status)->toBe('unmatched');
    $this->assertDatabaseCount('transaksi_keuangan', 0);
    $this->assertDatabaseCount('pembayaran_tagihan', 0);
});

it('leaves a room occupied after contract expiry until keys are physically returned', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    toBeDocument($r, $f['manager']);
    toBePay($r, $f['manager']);
    app(ConfirmResidenceCheckIn::class)->handle($r, $f['manager']);
    $r->update(['ends_at' => today()]);
    app(EndTemporaryStays::class)->handle();
    app(EndTemporaryStays::class)->handle();
    expect($r->fresh()->placement->status)->toBe('aktif');
    expect($r->fresh()->ended_at)->toBeNull();
    workflowTestInspection($r);
    $body = ['keys_received' => 1, 'room_vacated' => 1, 'condition' => 'damaged', 'notes' => 'Pintu rusak'];
    $this->actingAs($f['manager'])->post(route('residence.keys', $r), $body)->assertRedirect()->assertSessionHasNoErrors();
    $this->post(route('residence.keys', $r), $body)->assertRedirect()->assertSessionHasNoErrors();
    expect($r->fresh()->placement->status)->toBe('berakhir');
    expect($f['room']->fresh()->status)->toBe('maintenance');
    expect($f['profile']->residenceHistories()->where('event', 'checked_out')->count())->toBe(1);
});

it('denies facilitator creation of general public allocations', function () {
    $f = toBeFixture('non_student');
    $this->actingAs(toBeOfficer('fasilitator'))->post(route('andalas.temporary-stays.store'), [])->assertForbidden();
    $this->assertDatabaseCount('residence_registrations', 0);
});

it('links summer course participants and sponsor receivables without pretending they have arrived', function () {
    $f = toBeFixture('summer_course');
    $this->actingAs($f['manager'])->post(route('residence.applications.store'), [
        'number' => 'SC-001', 'kind' => 'summer_course', 'institution' => 'Universitas Mitra', 'recipient_email' => 'office@partner.test',
        'letter' => UploadedFile::fake()->create('request.pdf', 10, 'application/pdf'), 'starts_at' => '2026-11-05', 'ends_at' => '2026-11-08', 'funding' => 'sponsor', 'rate_unit' => 'day',
        'participants' => [['nama' => 'Peserta A', 'nim_nip' => 'PASS-001', 'email' => 'participant@partner.test', 'gender' => 'perempuan', 'kamar_id' => $f['room']->id]],
    ])->assertRedirect()->assertSessionHasNoErrors();
    $application = ResidenceApplication::sole();
    $r = $application->registrations()->sole();
    expect($r->completed_at)->toBeNull();
    expect((float) $r->tagihan->sponsor_total)->toBe(300000.0);
    $this->assertDatabaseCount('penempatan_kamar', 0);
    toBeDocument($r, $f['manager']);
    $this->post(route('residence.applications.approve', $application), ['support_verified' => 1])->assertRedirect()->assertSessionHasNoErrors();
    app(ConfirmResidenceCheckIn::class)->handle($r->fresh(), $f['manager']);
    expect((float) $r->tagihan->fresh()->sponsor_paid)->toBe(0.0);
    $reference = ResidencePaymentReference::factory()->create(['payer_type' => 'sponsor', 'amount' => 300000]);
    app(ReconcileResidencePayment::class)->handle($reference, [['tagihan_id' => $r->tagihan_id, 'jumlah' => 300000]], $f['manager']);
    expect((float) TransaksiKeuangan::sole()->nominal)->toBe(300000.0);
});

it('preserves historical occupancy and requires evidence instead of inventing a checkin timestamp', function () {
    $f = toBeFixture();
    $r = ResidenceRegistration::factory()->create(['student_profile_id' => $f['profile']->id, 'periode_id' => $f['period']->id, 'completed_at' => now()->subMonth(), 'status' => 'accepted']);
    $this->actingAs($f['manager'])->post(route('residence.historical', $r), ['notes' => 'Daftar serah kunci arsip', 'evidence' => UploadedFile::fake()->create('archive.pdf', 10, 'application/pdf')])->assertRedirect()->assertSessionHasNoErrors();
    expect($r->fresh()->historical_confirmed_at)->not->toBeNull();
    expect($r->fresh()->checked_in_at)->toBeNull();
    expect($r->fresh()->completed_at->toDateString())->toBe('2026-10-05');
    $this->assertDatabaseCount('tagihan', 0);
});

it('renders the workflow with scoped registrations and a complete operational payload', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    $this->actingAs($f['user'])->get(route('residence.workflow'))->assertRedirect(route('mahasiswa.registration'));
    $this->actingAs($f['user'])->get(route('mahasiswa.registration.status'))->assertInertia(fn (Assert $page) => $page->component('mahasiswa/registration-status')->where('page', 'registration')->has('registrations.data', 1)->where('registrations.data.0.id', $r->id)->where('manager', false));
    $this->actingAs($f['manager'])->get(route('residence.workflow'))->assertInertia(fn (Assert $page) => $page->where('manager', true)->has('policies', 1)->has('invoiceGroups')->has('pendingRoomContracts'));
});

it('renders the student service selection page with shell user payload and auto-provisions an active period when opening registration', function () {
    $f = toBeFixture();
    $this->actingAs($f['user'])->get(route('mahasiswa.layanan'))->assertOk()->assertInertia(
        fn (Assert $page) => $page
            ->component('mahasiswa/layanan')
            ->where('role', 'mahasiswa')
            ->where('page', 'layanan')
            ->where('initialUser.id', $f['user']->id)
    );

    RoomType::firstOrCreate(['code' => 'standar'], ['name' => 'Standar', 'active' => true]);
    ResidenceRate::create(['gedung_id' => $f['building']->id, 'tipe_kamar' => 'standar', 'unit' => 'year', 'amount' => 1000000, 'room_amount' => 10000000]);
    Periode::query()->delete();
    expect(Periode::where('status', 'aktif')->exists())->toBeFalse();

    $this->actingAs($f['manager'])->post(route('residence.policies'), [
        'category' => 'local_non_kipk',
        'open' => 1,
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect(Periode::where('status', 'aktif')->exists())->toBeTrue();
});

it('allows approving monthly scheme with zero upfront after leader approves deferral first', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f, ['rate_unit' => 'month', 'starts_at' => '2026-11-05', 'ends_at' => '2027-01-04']);
    toBeDocument($r, $f['manager']);
    $leader = toBeOfficer('pimpinan');
    $defer = ResidenceDecision::factory()->create(['residence_registration_id' => $r->id, 'kind' => 'defer']);
    $monthly = ResidenceDecision::factory()->create(['residence_registration_id' => $r->id, 'kind' => 'monthly']);
    $schedule = [['jumlah' => 100000, 'jatuh_tempo' => '2026-12-05'], ['jumlah' => 100000, 'jatuh_tempo' => '2027-01-05']];

    $this->actingAs($leader)->post(route('residence.decisions.review', $defer), [
        'status' => 'approved',
        'notes' => 'Penundaan disetujui pimpinan',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $this->actingAs($f['manager'])->post(route('residence.decisions.review', $defer), [
        'status' => 'approved',
        'notes' => 'Jadwal penundaan dikonfigurasi pengelola',
        'initial_amount' => 0,
        'schedule' => $schedule,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $this->actingAs($f['manager'])->post(route('residence.decisions.review', $monthly), [
        'status' => 'approved',
        'notes' => 'Skema bulanan mengikuti penundaan pimpinan',
        'initial_amount' => 0,
        'schedule' => $schedule,
    ])->assertRedirect()->assertSessionHasNoErrors();

    RegistrationDocument::factory()->create([
        'residence_registration_id' => $r->id,
        'kind' => $defer->fresh()->terms['agreement_kind'],
        'status' => 'valid',
        'reviewed_by' => $f['manager']->id,
        'reviewed_at' => now(),
    ]);
    app(ResidenceWorkflow::class)->evaluate($r->fresh());

    expect($r->fresh()->ready_at)->not->toBeNull();
});

it('allows managers to upload and delete document templates and students to download or receive missing template feedback', function () {
    Storage::fake('local');
    $f = toBeFixture();

    $this->actingAs($f['user'])
        ->get(route('residence.templates.download', ['category' => 'local_non_kipk', 'kind' => 'perjanjian']))
        ->assertRedirect()
        ->assertSessionHas('toast.type', 'error');

    $file = UploadedFile::fake()->create('template-perjanjian.docx', 50, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    $this->actingAs($f['manager'])
        ->post(route('residence.templates.store'), [
            'category' => 'local_non_kipk',
            'kind' => 'perjanjian',
            'file' => $file,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($f['user'])
        ->get(route('residence.templates.download', ['category' => 'local_non_kipk', 'kind' => 'perjanjian']))
        ->assertOk()
        ->assertHeader('content-disposition');

    $template = ResidenceDocumentTemplate::where('category', 'local_non_kipk')->where('kind', 'perjanjian')->firstOrFail();

    $this->actingAs($f['manager'])
        ->delete(route('residence.templates.destroy', $template))
        ->assertRedirect();

    expect(ResidenceDocumentTemplate::count())->toBe(0);
});

it('renders a dedicated registration detail page without summary totals', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);

    $this->actingAs($f['manager'])
        ->get(route('residence.registrations.show', $r))
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->component('admin/residence-workflow')
                ->where('detailMode', true)
                ->where('summary', [])
                ->where('registrations.data.0.id', $r->id)
        );
});

it('submits documents and installment decision in one package and locks saved documents until revision', function () {
    Storage::fake('local');
    $f = toBeFixture();
    $r = toBeSubmit($f);

    $this->actingAs($f['user'])
        ->post(route('residence.package.submit', $r), [
            'files' => [
                'perjanjian' => UploadedFile::fake()->create('perjanjian.pdf', 100, 'application/pdf'),
            ],
            'decision_kind' => 'installment',
            'decision_reason' => 'Mengajukan cicilan 2 termin',
        ])
        ->assertRedirect();

    expect($r->documents()->where('kind', 'perjanjian')->count())->toBe(1)
        ->and($r->decisions()->where('kind', 'installment')->where('status', 'pending')->count())->toBe(1);

    $this->actingAs($f['user'])
        ->post(route('residence.package.submit', $r), [
            'files' => [
                'perjanjian' => UploadedFile::fake()->create('perjanjian-v2.pdf', 100, 'application/pdf'),
            ],
        ])
        ->assertSessionHasErrors(['files.perjanjian']);
});

it('records full payment choice in package submission as approved without pending approval', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);

    $this->actingAs($f['user'])
        ->post(route('residence.package.submit', $r), [
            'decision_kind' => 'full',
        ])
        ->assertRedirect();

    expect($r->decisions()->where('kind', 'full')->where('status', 'approved')->count())->toBe(1);
});
