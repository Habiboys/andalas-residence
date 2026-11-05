<?php

use App\Actions\Billing\PostPayment;
use App\Actions\Billing\ReconcileResidencePayment;
use App\Actions\Registration\ConfirmResidenceCheckIn;
use App\Jobs\GenerateBillingDocument;
use App\Jobs\SendInstitutionInvoice;
use App\Models\FasilitatorWilayah;
use App\Models\InvoiceGroup;
use App\Models\Pembayaran;
use App\Models\ResidenceApplication;
use App\Models\ResidenceDecision;
use App\Models\ResidencePaymentReference;
use App\Models\ResidenceRegistration;
use App\Models\TransaksiKeuangan;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    $this->travelTo(now()->setDate(2026, 11, 5)->startOfDay());
    $this->withoutVite();
    Queue::fake();
    Notification::fake();
    Storage::fake('local');
});

function safetyApplicationInput(array $f, string $kind = 'international'): array
{
    return ['number' => 'APP-001', 'kind' => $kind, 'institution' => 'Institusi Uji', 'recipient_email' => 'office@institution.test',
        'letter' => UploadedFile::fake()->create('letter.pdf', 5, 'application/pdf'), 'starts_at' => today()->toDateString(), 'ends_at' => today()->addDays(3)->toDateString(),
        'funding' => 'sponsor', 'rate_unit' => 'day', 'participants' => [['nama' => 'Peserta', 'nim_nip' => 'PAS-001', 'email' => 'one@institution.test', 'gender' => 'perempuan', 'kamar_id' => $f['room']->id]]];
}

function safetyGroupInput(ResidenceApplication $application): array
{
    return ['residence_application_id' => $application->id, 'nomor' => 'FINAL-001', 'payer_type' => 'sponsor',
        'invoice_ids' => $application->registrations()->pluck('tagihan_id')->all(), 'recipient' => 'Penyelenggara', 'institution' => $application->institution,
        'subject' => 'Sewa kegiatan', 'bank' => 'Bank uji', 'account_number' => '12345', 'account_name' => 'AR', 'due_date' => today()->addDays(7)->toDateString(), 'signer' => 'Pimpinan'];
}

it('allows a public guest with approved transfer evidence to check in before official reconciliation', function () {
    $f = toBeFixture('non_student');
    $this->actingAs($f['manager'])->post(route('andalas.temporary-stays.store'), ['nama' => 'Umum', 'nim_nip' => 'NIK-001', 'gender' => 'perempuan', 'stay_kind' => 'non_student', 'kamar_id' => $f['room']->id, 'starts_at' => today()->toDateString(), 'ends_at' => today()->addDays(2)->toDateString()])->assertRedirect()->assertSessionHasNoErrors();
    $r = ResidenceRegistration::sole();
    toBeDocument($r, $f['manager']);
    $this->post(route('residence.transfer-proof', $r), ['nominal' => 200000, 'file' => UploadedFile::fake()->create('transfer.pdf', 5, 'application/pdf')])->assertRedirect()->assertSessionHasNoErrors();
    $this->post(route('residence.decisions.request', $r), ['kind' => 'transfer_permission', 'reason' => 'Transfer sudah dilakukan'])->assertRedirect()->assertSessionHasNoErrors();
    $this->post(route('residence.decisions.review', ResidenceDecision::sole()), ['status' => 'approved', 'notes' => 'Bukti dan identitas cocok', 'initial_amount' => 0])->assertRedirect()->assertSessionHasNoErrors();
    app(ConfirmResidenceCheckIn::class)->handle($r, $f['manager']);
    expect($r->fresh()->checked_in_at)->not->toBeNull();
    expect($r->fresh()->tagihan->total_dibayar)->toBe('0.00');
    $this->assertDatabaseCount('transaksi_keuangan', 0);
    $proof = Pembayaran::sole();
    $reference = ResidencePaymentReference::factory()->create(['amount' => 200000]);
    $allocations = [['tagihan_id' => $r->tagihan_id, 'jumlah' => 200000, 'payment_proof_id' => $proof->id]];
    app(ReconcileResidencePayment::class)->handle($reference, $allocations, $f['manager']);
    app(ReconcileResidencePayment::class)->handle($reference, $allocations, $f['manager']);
    expect($proof->fresh()->status)->toBe('lunas');
    expect($r->fresh()->tagihan->total_dibayar)->toBe('200000.00');
    $this->assertDatabaseCount('transaksi_keuangan', 1);
    $this->assertDatabaseCount('penempatan_kamar', 1);
});

it('keeps international sponsor obligations separate from the personal upgrade', function () {
    $f = toBeFixture('international');
    $input = safetyApplicationInput($f);
    $input['participants'][0]['sponsor_limit'] = 200000;
    $this->actingAs($f['manager'])->post(route('residence.applications.store'), $input)->assertRedirect()->assertSessionHasNoErrors();
    $app = ResidenceApplication::sole();
    $r = $app->registrations()->sole();
    toBeDocument($r, $f['manager']);
    $this->post(route('residence.applications.approve', $app), ['support_verified' => 1])->assertRedirect()->assertSessionHasNoErrors();
    expect($r->fresh()->tagihan->sponsor_total)->toBe('200000.00');
    expect($r->tagihan->total)->toBe('100000.00');
    $this->post(route('residence.checkin', $r), ['identity_checked' => 1, 'original_documents_checked' => 1, 'keys_handed' => 1])->assertSessionHasErrors('checkin');
    toBePay($r, $f['manager'], 100000);
    app(ConfirmResidenceCheckIn::class)->handle($r, $f['manager']);
    expect($r->fresh()->tagihan->sponsor_paid)->toBe('0.00');
    expect($r->fresh()->completed_at)->not->toBeNull();
});

it('uses the existing S2 account without duplicating or changing its roles', function () {
    $f = toBeFixture('international');
    $f['program']->update(['jenjang' => 'S2']);
    $roles = $f['user']->getRoleNames()->all();
    $input = safetyApplicationInput($f);
    $input['participants'][0] = ['nama' => $f['user']->nama, 'nim_nip' => $f['user']->nim_nip, 'email' => $f['user']->email, 'gender' => $f['user']->gender, 'kamar_id' => $f['room']->id];
    $this->actingAs($f['manager'])->post(route('residence.applications.store'), $input)->assertRedirect()->assertSessionHasNoErrors();
    expect(ResidenceRegistration::sole()->student_profile_id)->toBe($f['profile']->id);
    expect($f['user']->fresh()->getRoleNames()->all())->toBe($roles);
    $this->assertDatabaseCount('users', 2);
});

it('issues one final Summer Course invoice after the rental and reconciles every participant once', function () {
    $f = toBeFixture('summer_course');
    $input = safetyApplicationInput($f, 'summer_course');
    $input['participants'][] = [...$input['participants'][0], 'nama' => 'Peserta dua', 'nim_nip' => 'PAS-002', 'email' => 'two@institution.test'];
    $this->actingAs($f['manager'])->post(route('residence.applications.store'), $input)->assertRedirect()->assertSessionHasNoErrors();
    $app = ResidenceApplication::sole();
    $this->post(route('residence.applications.approve', $app), ['support_verified' => 1])->assertRedirect()->assertSessionHasNoErrors();
    Queue::assertNotPushed(GenerateBillingDocument::class);
    $registrations = $app->registrations()->get();
    foreach ($registrations as $r) {
        toBeDocument($r, $f['manager']);
    }
    app(ConfirmResidenceCheckIn::class)->handle($registrations[0], $f['manager']);
    expect($registrations[1]->fresh()->completed_at)->toBeNull();
    $this->post(route('andalas.invoice-groups.store'), safetyGroupInput($app))->assertSessionHasErrors('invoice_ids');
    $this->travel(1)->days();
    app(ConfirmResidenceCheckIn::class)->handle($registrations[1], $f['manager']);
    $this->travel(2)->days();
    $this->post(route('andalas.invoice-groups.store'), safetyGroupInput($app))->assertRedirect()->assertSessionHasNoErrors();
    $group = InvoiceGroup::sole();
    expect((float) $group->snapshot['total'])->toBe(600000.0);
    expect($group->invoice_ids)->toHaveCount(2);
    $reference = ResidencePaymentReference::factory()->create(['payer_type' => 'sponsor', 'amount' => 600000]);
    $allocations = $registrations->map(fn ($r) => ['tagihan_id' => $r->tagihan_id, 'jumlah' => 300000])->all();
    app(ReconcileResidencePayment::class)->handle($reference, $allocations, $f['manager']);
    app(ReconcileResidencePayment::class)->handle($reference, $allocations, $f['manager']);
    expect((float) TransaksiKeuangan::sole()->nominal)->toBe(600000.0);
    foreach ($registrations as $r) {
        expect($r->fresh()->tagihan->sponsor_paid)->toBe('300000.00');
    }
});

it('refuses mixing an unrelated invoice into an institution invoice', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    $application = ResidenceApplication::factory()->create();
    $input = [...safetyGroupInput($application), 'payer_type' => 'personal', 'invoice_ids' => [$r->tagihan_id]];
    $this->actingAs($f['manager'])->post(route('andalas.invoice-groups.store'), $input)->assertSessionHasErrors('invoice_ids');
    $this->assertDatabaseCount('invoice_groups', 0);
});

it('requires a completed inspection before returning keys and permits the assigned facilitator', function () {
    $f = toBeFixture();
    Permission::findOrCreate('inspection.manage');
    $r = toBeSubmit($f);
    toBeDocument($r, $f['manager']);
    toBePay($r, $f['manager']);
    $facilitator = toBeOfficer('fasilitator');
    FasilitatorWilayah::create(['user_id' => $facilitator->id, 'gedung_id' => $f['building']->id]);
    app(ConfirmResidenceCheckIn::class)->handle($r, $facilitator);
    $body = ['keys_received' => 1, 'room_vacated' => 1, 'condition' => 'ready', 'notes' => 'Kunci diterima'];
    $this->actingAs($facilitator)->post(route('residence.keys', $r), $body)->assertSessionHasErrors('keys');
    $this->post(route('residence.inspection', $r))->assertRedirect()->assertSessionHasNoErrors();
    $this->post(route('residence.inspection', $r))->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseCount('checkout_requests', 1);
    workflowTestInspection($r);
    $this->post(route('residence.keys', $r), $body)->assertRedirect()->assertSessionHasNoErrors();
    expect($r->fresh()->keys_returned_by)->toBe($facilitator->id);
});

it('does not let active period changes invalidate a recorded KIPK entitlement', function () {
    $f = toBeFixture('local_kipk');
    $r = toBeSubmit($f);
    toBeDocument($r, $f['manager']);
    $f['period']->update(['status' => 'nonaktif']);
    app(ConfirmResidenceCheckIn::class)->handle($r, $f['manager']);
    expect($r->fresh()->completed_at)->not->toBeNull();
});

it('rejects a duplicate payment reference with changed amounts', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    app(PostPayment::class)->handle('REFERENCE-ONE', $f['profile']->id, now()->toDateTimeString(), [['tagihan_id' => $r->tagihan_id, 'jumlah' => 100000]]);
    expect(fn () => app(PostPayment::class)->handle('REFERENCE-ONE', $f['profile']->id, now()->toDateTimeString(), [['tagihan_id' => $r->tagihan_id, 'jumlah' => 200000]]))->toThrow(InvalidArgumentException::class);
    expect($r->fresh()->tagihan->total_dibayar)->toBe('100000.00');
    $this->assertDatabaseCount('pembayaran_tagihan', 1);
});

it('records failed institution mail and retries without changing balances or sending twice after success', function () {
    $f = toBeFixture('summer_course');
    $this->actingAs($f['manager'])->post(route('residence.applications.store'), safetyApplicationInput($f, 'summer_course'))->assertRedirect()->assertSessionHasNoErrors();
    $app = ResidenceApplication::sole();
    $this->travel(3)->days();
    $this->post(route('andalas.invoice-groups.store'), safetyGroupInput($app))->assertRedirect()->assertSessionHasNoErrors();
    $group = InvoiceGroup::sole();
    $this->post(route('residence.invoices.send', $group))->assertRedirect()->assertSessionHasNoErrors();
    $this->post(route('residence.invoices.send', $group))->assertRedirect()->assertSessionHasNoErrors();
    Queue::assertPushed(SendInstitutionInvoice::class, 1);
    $job = new SendInstitutionInvoice($group->id);
    Notification::shouldReceive('sendNow')->once()->andThrow(new RuntimeException('Simulated SMTP failure'));
    expect(fn () => $job->handle())->toThrow(RuntimeException::class);
    $job->failed(new RuntimeException('Simulated SMTP failure'));
    expect($group->fresh()->delivery_status)->toBe('failed');
    expect($group->fresh()->delivered_at)->toBeNull();
    Notification::fake();
    $this->post(route('residence.invoices.send', $group))->assertRedirect()->assertSessionHasNoErrors();
    $job->handle();
    $job->handle();
    Notification::assertCount(1);
    expect($group->fresh()->delivery_status)->toBe('sent');
    expect($app->registrations()->sole()->tagihan->sponsor_paid)->toBe('0.00');
    $this->assertDatabaseCount('penempatan_kamar', 0);
});

it('rejects extending a local contract beyond the billed admission period', function () {
    $f = toBeFixture();
    $this->actingAs($f['user'])->post(route('andalas.registrations.store'), [
        'periode_id' => $f['period']->id, 'preferences' => [['kamar_id' => $f['room']->id]],
        'starts_at' => today()->toDateString(), 'ends_at' => today()->addYears(2)->toDateString(),
    ])->assertSessionHasErrors('ends_at');
    $this->assertDatabaseCount('residence_registrations', 0);
    $this->assertDatabaseCount('tagihan', 0);
});
