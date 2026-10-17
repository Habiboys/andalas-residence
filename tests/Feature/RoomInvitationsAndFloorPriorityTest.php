<?php

use App\Actions\Registration\CompleteResidenceRegistration;
use App\Actions\Registration\SubmitResidenceRegistration;
use App\Enums\ResidenceRegistrationStatus;
use App\Enums\TagihanStatus;
use App\Jobs\GenerateBillingDocument;
use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\KipkRecipient;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Models\RoomInvitation;
use App\Models\User;
use App\Services\FloorRoomAvailability;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->withoutVite();
    $this->freezeTime();
});

function invitationStudent(): User
{
    $user = User::factory()->student()->create(['gender' => 'perempuan', 'client_profile_category' => 'local_non_kipk'])->assignRole('mahasiswa');
    MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => fake()->uuid(), 'angkatan' => '2026']);

    return $user->load('mahasiswaProfil');
}

function invitationFixture(): array
{
    $host = invitationStudent();
    $friend = invitationStudent();
    $period = Periode::create(['nama_periode' => '2026/2027', 'status' => 'aktif', 'angkatan_maba' => 2026, 'tanggal_mulai' => today(), 'tanggal_selesai' => today()->addYear(), 'reservation_hours' => 24]);
    $building = Gedung::create(['kode_gedung' => 'INV', 'nama_gedung' => 'Gedung Teman', 'gender_peruntukan' => 'perempuan', 'allowed_categories' => ['local_non_kipk', 'student'], 'room_types' => [['type' => 'standar', 'enabled' => true, 'max_capacity' => 2, 'facilities' => 'Dipan, Lemari']]]);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai Utama', 'booking_open' => true, 'booking_priority' => 1]);
    $next = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 2, 'nama_lantai' => 'Lantai Berikutnya', 'booking_open' => true, 'booking_priority' => 2]);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => '101', 'kapasitas' => 2, 'status' => 'kosong', 'tipe_kamar' => 'standar', 'foto' => 'kamar/101.jpg']);
    $nextRoom = Kamar::create(['lantai_id' => $next->id, 'nomor_kamar' => '201', 'kapasitas' => 2, 'status' => 'kosong', 'tipe_kamar' => 'standar']);
    ResidenceRate::create(['gedung_id' => $building->id, 'tipe_kamar' => 'standar', 'unit' => 'year', 'amount' => 2500000]);
    $input = ['periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => $room->id]], 'rate_unit' => 'year'];
    $registration = app(SubmitResidenceRegistration::class)->handle($host->mahasiswaProfil, $input);

    return compact('host', 'friend', 'period', 'building', 'floor', 'next', 'room', 'nextRoom', 'registration', 'input');
}

it('enforces floor priority in both the catalog and direct registration requests', function () {
    $f = invitationFixture();
    expect(app(FloorRoomAvailability::class)->catalog($f['friend'])->pluck('id')->all())->toBe([$f['room']->id]);
    $this->actingAs($f['friend'])->post(route('andalas.registrations.store'), [...$f['input'], 'preferences' => [['kamar_id' => $f['nextRoom']->id]]])->assertSessionHasErrors('preferences');
    $this->assertDatabaseMissing('residence_registrations', ['student_profile_id' => $f['friend']->mahasiswaProfil->id]);
    app(SubmitResidenceRegistration::class)->handle($f['friend']->mahasiswaProfil, $f['input']);
    expect(app(FloorRoomAvailability::class)->catalog($f['host'])->pluck('id')->all())->toBe([$f['nextRoom']->id]);
    $f['next']->update(['booking_open' => false]);
    expect(app(FloorRoomAvailability::class)->catalog($f['host']))->toBeEmpty();
});

it('skips maintenance rooms and closed floors when finding the next priority', function () {
    $f = invitationFixture();
    $f['room']->update(['status' => 'maintenance']);
    expect(app(FloorRoomAvailability::class)->catalog($f['friend'])->pluck('id')->all())->toBe([$f['nextRoom']->id]);
    $f['room']->update(['status' => 'kosong']);
    $f['floor']->update(['booking_open' => false]);
    expect(app(FloorRoomAvailability::class)->catalog($f['friend'])->pluck('id')->all())->toBe([$f['nextRoom']->id]);
});

it('allows assigned facilitators to release floors and refuses unrelated buildings and students', function () {
    $f = invitationFixture();
    $facilitator = User::factory()->create()->assignRole('fasilitator');
    $data = ['booking_open' => false, 'booking_priority' => 3];
    $this->actingAs($facilitator)->put(route('andalas.lantai.availability', $f['floor']), $data)->assertForbidden();
    FasilitatorWilayah::create(['user_id' => $facilitator->id, 'gedung_id' => $f['building']->id]);
    $this->put(route('andalas.lantai.availability', $f['floor']), $data)->assertSessionHasNoErrors();
    expect($f['floor']->fresh()->booking_open)->toBeFalse()->and($f['floor']->fresh()->booking_priority)->toBe(3);
    $this->put(route('andalas.lantai.availability', $f['floor']), [...$data, 'booking_priority' => 0])->assertSessionHasErrors('booking_priority');
    $this->actingAs($f['friend'])->put(route('andalas.lantai.availability', $f['floor']), $data)->assertForbidden();
});

it('accepts a roommate invitation once and automatically completes housing after payment requirements', function () {
    Queue::fake([GenerateBillingDocument::class]);
    $f = invitationFixture();
    $this->actingAs($f['host'])->post(route('andalas.room-invitations.store'), ['registration_id' => $f['registration']->id, 'nim' => $f['friend']->nim_nip])->assertSessionHasNoErrors();
    $invitation = RoomInvitation::sole();
    $this->actingAs($f['friend'])->get(route('mahasiswa.registration'))->assertOk()->assertInertia(fn (Assert $page) => $page->where('room_invitations.0.incoming', true)->where('room_invitations.0.room_number', '101')->where('room_invitations.0.estimated_total', 2500000)->where('rooms.0.available_places', 1));
    $this->put(route('andalas.room-invitations.update', $invitation), ['accept' => true])->assertSessionHasNoErrors();
    $accepted = ResidenceRegistration::findOrFail($invitation->fresh()->accepted_registration_id);
    expect($accepted->reserved_room_id)->toBe($f['room']->id)->and($accepted->status)->toBe(ResidenceRegistrationStatus::Submitted);
    $this->put(route('andalas.room-invitations.update', $invitation), ['accept' => true])->assertSessionHasNoErrors();
    $this->assertDatabaseCount('residence_registrations', 2);
    $accepted->tagihan->update(['status' => TagihanStatus::Lunas, 'total_dibayar' => $accepted->tagihan->total]);
    app(CompleteResidenceRegistration::class)->handle($accepted);
    expect($accepted->fresh()->status)->toBe(ResidenceRegistrationStatus::Accepted)->and($accepted->fresh()->placement->kamar_id)->toBe($f['room']->id);
    Queue::assertPushed(GenerateBillingDocument::class);
});

it('rechecks capacity on acceptance and rolls back when another invitee fills the last place', function () {
    $f = invitationFixture();
    $other = invitationStudent();
    foreach ([$f['friend'], $other] as $student) {
        $this->actingAs($f['host'])->post(route('andalas.room-invitations.store'), ['registration_id' => $f['registration']->id, 'nim' => $student->nim_nip])->assertSessionHasNoErrors();
    }
    $first = RoomInvitation::where('invitee_id', $f['friend']->id)->sole();
    $second = RoomInvitation::where('invitee_id', $other->id)->sole();
    $this->actingAs($f['friend'])->put(route('andalas.room-invitations.update', $first), ['accept' => true])->assertSessionHasNoErrors();
    $this->actingAs($other)->put(route('andalas.room-invitations.update', $second), ['accept' => true])->assertSessionHasErrors('preferences');
    expect($second->fresh()->status)->toBe('pending');
    $this->assertDatabaseCount('residence_registrations', 2);
    $this->assertDatabaseCount('tagihan', 2);
});

it('refuses self invitations KIPK recipients and unauthorized access', function () {
    $f = invitationFixture();
    $data = ['registration_id' => $f['registration']->id, 'nim' => $f['host']->nim_nip];
    $this->actingAs($f['host'])->post(route('andalas.room-invitations.store'), $data)->assertSessionHasErrors('nim');
    KipkRecipient::create(['nim' => $f['friend']->nim_nip, 'nama' => $f['friend']->nama, 'angkatan' => 2026]);
    $this->post(route('andalas.room-invitations.store'), [...$data, 'nim' => $f['friend']->nim_nip])->assertSessionHasErrors('nim');
    KipkRecipient::query()->delete();
    $this->post(route('andalas.room-invitations.store'), [...$data, 'nim' => $f['friend']->nim_nip])->assertSessionHasNoErrors();
    $invitation = RoomInvitation::sole();
    $other = invitationStudent();
    $this->actingAs($other)->put(route('andalas.room-invitations.update', $invitation), ['accept' => true])->assertNotFound();
    $this->delete(route('andalas.room-invitations.destroy', $invitation))->assertNotFound();
    $this->post(route('andalas.room-invitations.store'), $data)->assertNotFound();
    expect($invitation->fresh()->status)->toBe('pending');
});

it('supports decline cancellation and expiry without creating a registration', function () {
    $f = invitationFixture();
    $data = ['registration_id' => $f['registration']->id, 'nim' => $f['friend']->nim_nip];
    $this->actingAs($f['host'])->post(route('andalas.room-invitations.store'), $data)->assertSessionHasNoErrors();
    $invitation = RoomInvitation::sole();
    $this->actingAs($f['friend'])->put(route('andalas.room-invitations.update', $invitation), ['accept' => false])->assertSessionHasNoErrors();
    expect($invitation->fresh()->status)->toBe('declined');
    $this->actingAs($f['host'])->post(route('andalas.room-invitations.store'), $data)->assertSessionHasNoErrors();
    $this->delete(route('andalas.room-invitations.destroy', $invitation))->assertSessionHasNoErrors();
    $this->actingAs($f['friend'])->put(route('andalas.room-invitations.update', $invitation), ['accept' => true])->assertSessionHasErrors('invitation');
    $this->actingAs($f['host'])->post(route('andalas.room-invitations.store'), $data)->assertSessionHasNoErrors();
    $invitation->refresh()->update(['expires_at' => now()->subMinute()]);
    $this->actingAs($f['friend'])->put(route('andalas.room-invitations.update', $invitation), ['accept' => true])->assertSessionHasErrors('invitation');
    $this->assertDatabaseCount('residence_registrations', 1);
});

it('honors a held reservation when its floor is later closed or reprioritized', function () {
    Queue::fake([GenerateBillingDocument::class]);
    $f = invitationFixture();
    $f['floor']->update(['booking_open' => false, 'booking_priority' => 10]);
    $f['registration']->tagihan->update(['status' => TagihanStatus::Lunas, 'total_dibayar' => $f['registration']->tagihan->total]);
    app(CompleteResidenceRegistration::class)->handle($f['registration']);
    expect($f['registration']->fresh()->status)->toBe(ResidenceRegistrationStatus::Accepted);
    $this->assertDatabaseHas('penempatan_kamar', ['kamar_id' => $f['room']->id, 'mahasiswa_id' => $f['host']->mahasiswaProfil->id]);
    Queue::assertPushed(GenerateBillingDocument::class);
});

it('keeps newly created floors closed until an authorized manager opens them', function () {
    $f = invitationFixture();
    $manager = User::factory()->create()->assignRole('staff_admin');
    $this->actingAs($manager)->post(route('andalas.lantai.store'), ['gedung_id' => $f['building']->id, 'nomor_lantai' => 3, 'nama_lantai' => 'Lantai Baru'])->assertSessionHasNoErrors();
    $floor = Lantai::where('nama_lantai', 'Lantai Baru')->sole();
    expect($floor->booking_open)->toBeFalse();
    $this->put(route('andalas.lantai.availability', $floor), ['booking_open' => true, 'booking_priority' => 1])->assertSessionHasNoErrors();
    expect($floor->fresh()->booking_open)->toBeTrue();
});

it('rechecks eligibility and host validity when accepting an existing invitation', function () {
    $f = invitationFixture();
    $this->actingAs($f['host'])->post(route('andalas.room-invitations.store'), ['registration_id' => $f['registration']->id, 'nim' => $f['friend']->nim_nip])->assertSessionHasNoErrors();
    $invitation = RoomInvitation::sole();
    $f['friend']->update(['gender' => 'laki_laki']);
    $this->actingAs($f['friend'])->put(route('andalas.room-invitations.update', $invitation), ['accept' => true])->assertSessionHasErrors('preferences');
    $f['friend']->update(['gender' => 'perempuan']);
    $f['registration']->update(['status' => ResidenceRegistrationStatus::Rejected]);
    $this->put(route('andalas.room-invitations.update', $invitation), ['accept' => true])->assertSessionHasErrors('invitation');
    expect($invitation->fresh()->status)->toBe('pending');
    $this->assertDatabaseCount('residence_registrations', 1);
});
