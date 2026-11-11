<?php

use App\Actions\Registration\ConfirmResidenceCheckIn;
use App\Models\FasilitatorWilayah;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\ResidenceApplication;
use App\Models\ResidenceDecision;
use App\Models\ResidenceRegistration;
use App\Models\RoomInvitation;
use App\Models\User;
use App\Notifications\ResidenceWorkflowNotification;
use App\Services\ResidenceLifecycle;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->withoutVite();
    Queue::fake();
    Notification::fake();
    Storage::fake('local');
});

it('confirms physical checkin to the resident once after all requirements pass', function () {
    Queue::fake();
    Notification::fake();
    $f = toBeFixture();
    $registration = toBeSubmit($f);
    toBeDocument($registration, $f['manager']);
    toBePay($registration, $f['manager']);
    Notification::fake();
    app(ConfirmResidenceCheckIn::class)->handle($registration, $f['manager']);
    app(ConfirmResidenceCheckIn::class)->handle($registration, $f['manager']);
    Notification::assertSentTo($f['user'], ResidenceWorkflowNotification::class, fn ($notification) => $notification->subject === 'Check-in selesai');
    Notification::assertCount(1);
    $this->assertDatabaseCount('penempatan_kamar', 1);
    expect($registration->fresh()->checked_in_at)->not->toBeNull();
});

it('registers local postgraduate students without an institutional letter', function (string $degree) {
    $f = toBeFixture('international');
    $f['program']->update(['jenjang' => $degree]);
    $body = ['number' => 'PG-1', 'kind' => 'postgraduate', 'recipient_email' => 'student@example.test', 'starts_at' => today()->toDateString(), 'ends_at' => today()->addYear()->toDateString(), 'funding' => 'personal', 'rate_unit' => 'year', 'participants' => [['nama' => 'Mahasiswa Pascasarjana', 'nim_nip' => '2699000012', 'email' => 'student@example.test', 'gender' => 'perempuan', 'kamar_id' => $f['room']->id, 'prodi_id' => $f['program']->id]]];
    $this->actingAs($f['manager'])->post(route('residence.applications.store'), $body)->assertRedirect()->assertSessionHasNoErrors();
    $application = ResidenceApplication::sole();
    expect($application->letter_path)->toBeNull()->and($application->institution)->toBeNull();
    $r = $application->registrations()->sole();
    expect($r->studentProfile->user->client_profile_category->value)->toBe('local_non_kipk');
    expect($r->studentProfile->prodi->jenjang)->toBe($degree);
    expect((float) $r->tagihan->total)->toBe(1000000.0);
})->with(['S2', 'S3']);

it('requires the actual postgraduate profile and preserves existing roles', function () {
    $f = toBeFixture('international');
    $f['program']->update(['jenjang' => 'S2']);
    $f['user']->assignRole('pimpinan');
    $body = ['number' => 'PG-OLD', 'kind' => 'postgraduate', 'recipient_email' => $f['user']->email, 'starts_at' => today()->toDateString(), 'ends_at' => today()->addYear()->toDateString(), 'funding' => 'personal', 'rate_unit' => 'year', 'participants' => [['nama' => $f['user']->nama, 'nim_nip' => $f['user']->nim_nip, 'email' => $f['user']->email, 'gender' => 'perempuan', 'kamar_id' => $f['room']->id, 'prodi_id' => $f['program']->id]]];
    $this->actingAs($f['manager'])->post(route('residence.applications.store'), $body)->assertRedirect()->assertSessionHasNoErrors();
    expect($f['user']->fresh()->hasAllRoles(['mahasiswa', 'pimpinan']))->toBeTrue();
    expect(ResidenceApplication::sole()->registrations()->sole()->student_profile_id)->toBe($f['profile']->id);
});

it('rejects S1 postgraduate requests and keeps international letters mandatory', function () {
    $f = toBeFixture('international');
    $body = ['number' => 'PG-WRONG', 'kind' => 'postgraduate', 'recipient_email' => 'test@example.test', 'starts_at' => today()->toDateString(), 'ends_at' => today()->addYear()->toDateString(), 'funding' => 'personal', 'rate_unit' => 'year', 'participants' => [['nama' => 'Test', 'nim_nip' => '2699111111', 'email' => 'test@example.test', 'gender' => 'perempuan', 'kamar_id' => $f['room']->id, 'prodi_id' => $f['program']->id]]];
    $this->actingAs($f['manager'])->post(route('residence.applications.store'), $body)->assertSessionHasErrors('participants.0.prodi_id');
    $this->post(route('residence.applications.store'), [...$body, 'kind' => 'international'])->assertSessionHasErrors(['institution', 'letter']);
    $this->assertDatabaseCount('residence_applications', 0);
});

it('requires leader approval then manager terms then the specific validated financing agreement', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    toBeDocument($r, $f['manager']);
    $decision = ResidenceDecision::factory()->create(['residence_registration_id' => $r->id, 'kind' => 'defer']);
    $leader = toBeOfficer('pimpinan');
    $terms = ['status' => 'approved', 'notes' => 'Ditunda sesuai keputusan', 'initial_amount' => 0, 'schedule' => [['jumlah' => 1000000, 'jatuh_tempo' => today()->addMonth()->toDateString()]]];
    $this->actingAs($f['manager'])->post(route('residence.decisions.review', $decision), $terms)->assertForbidden();
    $this->actingAs($leader)->post(route('residence.decisions.review', $decision), $terms)->assertRedirect()->assertSessionHasNoErrors();
    expect($decision->fresh()->terms['requires_configuration'])->toBeTrue();
    $this->assertDatabaseCount('jadwal_cicilan', 0);
    $agreement = $decision->fresh()->terms['agreement_kind'];
    $this->actingAs($f['user'])->post(route('residence.documents.upload', $r), ['kind' => $agreement, 'file' => UploadedFile::fake()->create('agreement.pdf', 10, 'application/pdf')])->assertSessionHasErrors('kind');
    $this->actingAs($leader)->post(route('residence.decisions.review', $decision), $terms)->assertForbidden();
    $this->actingAs($f['manager'])->post(route('residence.decisions.review', $decision), $terms)->assertRedirect()->assertSessionHasNoErrors();
    expect($decision->fresh()->decided_by)->toBe($leader->id);
    expect($r->fresh()->ready_at)->toBeNull();
    $checkin = ['identity_checked' => 1, 'original_documents_checked' => 1, 'keys_handed' => 1];
    $this->post(route('residence.checkin', $r), $checkin)->assertSessionHasErrors('checkin');
    $this->actingAs($f['user'])->post(route('residence.documents.upload', $r), ['kind' => $agreement, 'file' => UploadedFile::fake()->create('agreement.pdf', 10, 'application/pdf')])->assertRedirect()->assertSessionHasNoErrors();
    $doc = $r->documents()->where('kind', $agreement)->sole();
    $this->actingAs($f['manager'])->post(route('residence.documents.review', $doc), ['status' => 'valid'])->assertRedirect()->assertSessionHasNoErrors();
    $this->post(route('residence.checkin', $r), $checkin)->assertRedirect()->assertSessionHasNoErrors();
    expect((float) $r->fresh()->tagihan->total_dibayar)->toBe(0.0);
    expect($r->fresh()->checked_in_at)->not->toBeNull();
    $this->post(route('residence.decisions.review', $decision), $terms)->assertForbidden();
    $this->assertDatabaseCount('jadwal_cicilan', 1);
});

it('keeps the checkin classification after the active intake changes', function () {
    $f = toBeFixture('local_kipk');
    $r = toBeSubmit($f, ['is_kipk' => true]);
    toBeDocument($r, $f['manager']);
    app(ConfirmResidenceCheckIn::class)->handle($r, $f['manager']);
    expect($r->fresh()->checkin_classification)->toBe('binaan');
    $f['period']->update(['angkatan_maba' => 2027]);
    expect(app(ResidenceLifecycle::class)->isBinaan($f['profile']))->toBeFalse();
    app(ConfirmResidenceCheckIn::class)->handle($r, $f['manager']);
    expect($r->fresh()->checkin_classification)->toBe('binaan');
});

function auditOccupiedRoom(): array
{
    $f = toBeFixture();
    $r = toBeSubmit($f);
    toBeDocument($r, $f['manager']);
    toBePay($r, $f['manager']);
    app(ConfirmResidenceCheckIn::class)->handle($r, $f['manager']);
    $target = $f['room']->replicate();
    $target->nomor_kamar = '102';
    $target->status = 'kosong';
    $target->save();

    return [...$f, 'registration' => $r->fresh(), 'target' => $target];
}

it('moves occupancy once without altering payment history and retains damaged rooms', function () {
    $f = auditOccupiedRoom();
    $r = $f['registration'];
    $old = $r->penempatan_kamar_id;
    $body = ['reference' => fake()->uuid(), 'room_id' => $f['target']->id, 'reason' => 'Kamar asal perlu perbaikan', 'keys_exchanged' => 1, 'room_condition' => 'damaged'];
    $this->actingAs($f['manager'])->post(route('residence.move', $r), $body)->assertRedirect()->assertSessionHasNoErrors();
    $this->post(route('residence.move', $r), $body)->assertRedirect()->assertSessionHasNoErrors();
    expect($r->fresh()->reserved_room_id)->toBe($f['target']->id);
    expect(PenempatanKamar::find($old)->status)->toBe('berakhir');
    expect(app(ResidenceLifecycle::class)->hasEndedStay($f['profile']))->toBeFalse();
    expect($f['room']->fresh()->status)->toBe('maintenance');
    expect((float) $r->fresh()->tagihan->total_dibayar)->toBe(1000000.0);
    $this->assertDatabaseCount('residence_amendments', 1);
    $this->assertDatabaseCount('pembayaran_tagihan', 1);
    expect(PenempatanKamar::where('status', 'aktif')->count())->toBe(1);
    $this->get(route('residence.amendments.document', $body['reference']))->assertOk()->assertHeader('content-type', 'application/pdf');
    $this->actingAs(toBeOfficer('mahasiswa'))->get(route('residence.amendments.document', $body['reference']))->assertForbidden();
});

it('rejects room moves into full rooms and across a facilitators building boundary', function () {
    $f = auditOccupiedRoom();
    $r = $f['registration'];
    $body = ['reference' => fake()->uuid(), 'room_id' => $f['target']->id, 'reason' => 'Mutasi', 'keys_exchanged' => 1, 'room_condition' => 'ready'];
    $fac = toBeOfficer('fasilitator');
    FasilitatorWilayah::create(['user_id' => $fac->id, 'gedung_id' => $f['building']->id]);
    $other = toBeFixture('international');
    $body['room_id'] = $other['room']->id;
    $this->actingAs($fac)->post(route('residence.move', $r), $body)->assertForbidden();
    $f['target']->update(['kapasitas' => 0]);
    $body['room_id'] = $f['target']->id;
    $this->actingAs($f['manager'])->post(route('residence.move', $r), $body)->assertSessionHasErrors('room_id');
    expect($r->fresh()->reserved_room_id)->toBe($f['room']->id);
    $this->assertDatabaseCount('residence_amendments', 0);
});

it('revises shared members without deleting paid money and allocates all cents exactly', function () {
    $f = toBeFixture(capacity: 3);
    $r = toBeSubmit($f, ['billing_basis' => 'room']);
    $this->actingAs($f['manager'])->post(route('residence.contracts'), ['registration_ids' => [$r->id]])->assertRedirect()->assertSessionHasNoErrors();
    $r = $r->fresh();
    toBePay($r, $f['manager']);
    $member = User::factory()->student()->create(['gender' => 'perempuan'])->assignRole('mahasiswa');
    MahasiswaProfil::create(['user_id' => $member->id, 'prodi_id' => $f['program']->id, 'angkatan' => '2025', 'barcode_code' => fake()->uuid()]);
    $this->actingAs($f['user'])->post(route('andalas.room-invitations.store'), ['registration_id' => $r->id, 'nim' => $member->nim_nip])->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($member)->put(route('andalas.room-invitations.update', RoomInvitation::sole()), ['accept' => true])->assertRedirect()->assertSessionHasNoErrors();
    $new = ResidenceRegistration::where('student_profile_id', $member->mahasiswaProfil->id)->sole();
    $body = ['reference' => fake()->uuid(), 'members' => [$r->id, $new->id], 'reason' => 'Anggota baru menyetujui kontrak', 'consent' => UploadedFile::fake()->create('consent.pdf', 10, 'application/pdf')];
    $this->actingAs($f['manager'])->post(route('residence.contracts.revise', $r->room_contract_id), $body)->assertRedirect()->assertSessionHasNoErrors();
    $this->post(route('residence.contracts.revise', $r->room_contract_id), $body)->assertRedirect()->assertSessionHasNoErrors();
    expect((float) $r->fresh()->tagihan->total)->toBe(5000000.0);
    expect((float) $new->fresh()->tagihan->total)->toBe(5000000.0);
    expect((float) $r->fresh()->tagihan->total_dibayar)->toBe(10000000.0);
    $this->assertDatabaseCount('residence_amendments', 1);
    $this->assertDatabaseCount('pembayaran_tagihan', 1);
    $body['reference'] = fake()->uuid();
    $body['members'] = [$new->id];
    $this->post(route('residence.contracts.revise', $r->room_contract_id), $body)->assertRedirect()->assertSessionHasNoErrors();
    expect((float) $r->fresh()->tagihan->total)->toBe(0.0);
    expect((float) $new->fresh()->tagihan->total)->toBe(10000000.0);
    expect((float) $r->fresh()->tagihan->total_dibayar)->toBe(10000000.0);
    $this->get(route('residence.workflow'))->assertInertia(fn (AssertableInertia $p) => $p->where('summary.credits', 10000000)->where('summary.receivables', 10000000));
    $this->get(route('residence.amendments.document', $body['reference']))->assertOk();
});

it('accepts replay when MySQL returns JSON object keys in a different order', function () {
    $f = toBeFixture();
    $registration = toBeSubmit($f);
    $reference = toBePay($registration, $f['manager']);
    $reference->update(['allocations' => [['jumlah' => '1000000.00', 'payment_proof_id' => null, 'tagihan_id' => $registration->tagihan_id]]]);
    $this->actingAs($f['manager'])->post(route('residence.payments.match', $reference), ['allocations' => [['tagihan_id' => $registration->tagihan_id, 'jumlah' => 1000000]]])->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseCount('pembayaran_tagihan', 1);
    $this->assertDatabaseCount('transaksi_keuangan', 1);
});

it('reopens financing approval after a paid shared contract changes without deleting its old schedule', function () {
    $f = toBeFixture(capacity: 3);
    $r = toBeSubmit($f, ['billing_basis' => 'room']);
    $this->actingAs($f['manager'])->post(route('residence.contracts'), ['registration_ids' => [$r->id]])->assertSessionHasNoErrors();
    $r = $r->fresh();
    $decision = ResidenceDecision::factory()->create(['residence_registration_id' => $r->id, 'kind' => 'installment', 'status' => 'approved', 'terms' => ['initial_amount' => 1000000]]);
    $oldTerm = $r->tagihan->jadwalCicilan()->create(['termin_ke' => 1, 'jumlah' => 10000000, 'jatuh_tempo' => today()->addMonth()]);
    toBePay($r, $f['manager'], 1000000);
    $member = User::factory()->student()->create(['gender' => 'perempuan'])->assignRole('mahasiswa');
    MahasiswaProfil::create(['user_id' => $member->id, 'prodi_id' => $f['program']->id, 'angkatan' => '2025', 'barcode_code' => fake()->uuid()]);
    $this->actingAs($f['user'])->post(route('andalas.room-invitations.store'), ['registration_id' => $r->id, 'nim' => $member->nim_nip])->assertSessionHasNoErrors();
    $this->actingAs($member)->put(route('andalas.room-invitations.update', RoomInvitation::sole()), ['accept' => true])->assertSessionHasNoErrors();
    $new = ResidenceRegistration::where('student_profile_id', $member->mahasiswaProfil->id)->sole();
    $this->actingAs($f['manager'])->post(route('residence.contracts.revise', $r->room_contract_id), ['reference' => fake()->uuid(), 'members' => [$r->id, $new->id], 'reason' => 'Revisi pembagian biaya', 'consent' => UploadedFile::fake()->create('consent.pdf', 10, 'application/pdf')])->assertRedirect()->assertSessionHasNoErrors();
    expect($decision->fresh()->status)->toBe('superseded');
    expect($oldTerm->fresh()->status)->toBe('diganti');
    $revision = $r->decisions()->where('status', 'pending')->sole();
    $this->actingAs(toBeOfficer('pimpinan'))->post(route('residence.decisions.review', $revision), ['status' => 'approved', 'notes' => 'Skema baru disetujui'])->assertSessionHasNoErrors();
    $this->actingAs($f['manager'])->post(route('residence.decisions.review', $revision), ['status' => 'approved', 'notes' => 'Saldo empat juta', 'initial_amount' => 1000000, 'schedule' => [['jumlah' => 1000000, 'jatuh_tempo' => today()->toDateString()], ['jumlah' => 3000000, 'jatuh_tempo' => today()->addMonth()->toDateString()]]])->assertSessionHasNoErrors();
    expect((float) $r->fresh()->tagihan->total_dibayar)->toBe(1000000.0);
    expect($r->tagihan->jadwalCicilan()->count())->toBe(3);
    expect($revision->fresh()->terms['initial_amount'])->toEqual(2000000);
});

it('moves one shared member with consent and reprices both obligations atomically', function () {
    $f = toBeFixture(capacity: 3);
    $r = toBeSubmit($f, ['billing_basis' => 'room']);
    $member = User::factory()->student()->create(['gender' => 'perempuan'])->assignRole('mahasiswa');
    MahasiswaProfil::create(['user_id' => $member->id, 'prodi_id' => $f['program']->id, 'angkatan' => '2025', 'barcode_code' => fake()->uuid()]);
    $this->actingAs($f['user'])->post(route('andalas.room-invitations.store'), ['registration_id' => $r->id, 'nim' => $member->nim_nip])->assertSessionHasNoErrors();
    $this->actingAs($member)->put(route('andalas.room-invitations.update', RoomInvitation::sole()), ['accept' => true])->assertSessionHasNoErrors();
    $other = ResidenceRegistration::where('student_profile_id', $member->mahasiswaProfil->id)->sole();
    $this->actingAs($f['manager'])->post(route('residence.contracts'), ['registration_ids' => [$r->id, $other->id]])->assertSessionHasNoErrors();
    $r = $r->fresh();
    toBeDocument($r, $f['manager']);
    toBePay($r, $f['manager']);
    app(ConfirmResidenceCheckIn::class)->handle($r, $f['manager']);
    $target = $f['room']->replicate();
    $target->nomor_kamar = '102';
    $target->status = 'kosong';
    $target->save();
    $body = ['reference' => fake()->uuid(), 'room_id' => $target->id, 'reason' => 'Disetujui seluruh anggota', 'keys_exchanged' => 1, 'room_condition' => 'ready'];
    $this->post(route('residence.move', $r), $body)->assertSessionHasErrors('consent');
    expect($r->fresh()->room_contract_id)->not->toBeNull();
    $body['consent'] = UploadedFile::fake()->create('consent.pdf', 10, 'application/pdf');
    $this->post(route('residence.move', $r), $body)->assertRedirect()->assertSessionHasNoErrors();
    $this->post(route('residence.move', $r), $body)->assertRedirect()->assertSessionHasNoErrors();
    expect($r->fresh()->room_contract_id)->toBeNull();
    expect($r->fresh()->reserved_room_id)->toBe($target->id);
    expect((float) $r->fresh()->tagihan->total)->toBe(1000000.0);
    expect((float) $r->fresh()->tagihan->total_dibayar)->toBe(5000000.0);
    expect((float) $other->fresh()->tagihan->total)->toBe(10000000.0);
    expect($other->fresh()->roomContract->occupants)->toBe(1);
    $this->actingAs($member)->get(route('residence.amendments.document', $body['reference']))->assertOk();
    $this->get(route('residence.workflow'))->assertInertia(fn (AssertableInertia $p) => $p->has('registrations.data.0.amendments', 1));
    $this->assertDatabaseCount('residence_amendments', 1);
});

it('rejects revised deferral upfront amounts above the outstanding balance', function () {
    $f = toBeFixture();
    $r = toBeSubmit($f);
    toBePay($r, $f['manager'], 400000);
    $decision = ResidenceDecision::factory()->create(['residence_registration_id' => $r->id, 'kind' => 'defer', 'status' => 'approved', 'terms' => ['amendment_id' => fake()->uuid(), 'requires_configuration' => true]]);
    $this->actingAs($f['manager'])->post(route('residence.decisions.review', $decision), ['status' => 'approved', 'notes' => 'Koreksi saldo', 'initial_amount' => 700000, 'schedule' => [['jumlah' => 600000, 'jatuh_tempo' => today()->addMonth()->toDateString()]]])->assertSessionHasErrors('schedule');
    expect($decision->fresh()->terms['requires_configuration'])->toBeTrue();
    $this->assertDatabaseCount('jadwal_cicilan', 0);
});
