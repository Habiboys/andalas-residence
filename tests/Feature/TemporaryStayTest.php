<?php

use App\Actions\Checkout\EndTemporaryStays;
use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\KipkRecipient;
use App\Models\Lantai;
use App\Models\Periode;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Models\Tagihan;
use App\Models\User;
use App\Notifications\TemporaryStayEnded;
use App\Services\ResidenceLifecycle;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

function temporaryStayFixture(): array
{
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $facilitator = User::factory()->create()->assignRole('fasilitator');
    Periode::create(['nama_periode' => '2026', 'status' => 'aktif', 'tanggal_mulai' => '2026-01-01', 'tanggal_selesai' => '2026-12-31', 'angkatan_maba' => 2026]);
    $building = Gedung::create(['kode_gedung' => 'TEMP', 'nama_gedung' => 'Sementara', 'gender_peruntukan' => 'campur']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => '101', 'kapasitas' => 2, 'status' => 'kosong', 'tipe_kamar' => 'standar', 'tarif_per_periode' => 100000]);
    ResidenceRate::create(['gedung_id' => $building->id, 'tipe_kamar' => 'standar', 'unit' => 'day', 'amount' => 100000]);
    FasilitatorWilayah::create(['user_id' => $facilitator->id, 'gedung_id' => $building->id]);
    $data = ['nama' => 'Peserta', 'nim_nip' => 'PASPOR-123', 'email' => 'peserta@example.test', 'gender' => 'perempuan', 'stay_kind' => 'summer_course', 'client_profile_category' => 'non_student', 'kamar_id' => $room->id, 'starts_at' => '2026-09-26', 'ends_at' => '2026-09-28'];

    return compact('admin', 'facilitator', 'building', 'room', 'data');
}

it('creates a daily invoice and releases the bed exactly once without erasing debt', function () {
    $this->travelTo(now()->setDate(2026, 9, 26));
    $this->seed(RolePermissionSeeder::class);
    $f = temporaryStayFixture();
    $this->actingAs($f['admin'])->post(route('andalas.temporary-stays.store'), $f['data'])->assertSessionHasNoErrors();
    $stay = ResidenceRegistration::sole();
    expect((float) $stay->tagihan->total)->toBe(200000.0)->and($stay->placement->status)->toBe('aktif');
    app(EndTemporaryStays::class)->handle();
    expect($stay->fresh()->ended_at)->toBeNull();
    $this->travelTo(now()->setDate(2026, 9, 28));
    app(EndTemporaryStays::class)->handle();
    app(EndTemporaryStays::class)->handle();
    expect($stay->fresh()->placement->status)->toBe('berakhir')->and($f['room']->fresh()->status)->toBe('kosong')
        ->and((float) Tagihan::sole()->total_dibayar)->toBe(0.0);
    $this->assertDatabaseCount('checkout_requests', 1);
    expect($f['facilitator']->notifications()->where('type', TemporaryStayEnded::class)->count())->toBe(1);
    $this->actingAs($f['facilitator'])->get(route('fasilitator.temporary-stays'))->assertOk()->assertInertia(fn (Assert $page) => $page->has('notifications', 1)->has('stays', 1));
});

it('restricts facilitators to nonstudents in their assigned building', function () {
    $this->travelTo(now()->setDate(2026, 9, 26));
    $this->seed(RolePermissionSeeder::class);
    $f = temporaryStayFixture();
    $this->actingAs($f['facilitator'])->post(route('andalas.temporary-stays.store'), $f['data'])->assertForbidden();
    $this->post(route('andalas.temporary-stays.store'), [...$f['data'], 'stay_kind' => 'non_student'])->assertSessionHasNoErrors();
    $outsider = User::factory()->create()->assignRole('fasilitator');
    $this->actingAs($outsider)->post(route('andalas.temporary-stays.store'), [...$f['data'], 'stay_kind' => 'non_student'])->assertForbidden();
    $this->get(route('fasilitator.temporary-stays'))->assertInertia(fn (Assert $page) => $page->has('stays', 0)->has('rooms', 0));
    $student = User::factory()->create()->assignRole('mahasiswa');
    $this->actingAs($student)->post(route('andalas.temporary-stays.store'), $f['data'])->assertForbidden();
    $this->assertDatabaseCount('residence_registrations', 1);
});

it('rolls back account invoice and placement when the daily rate is missing or room unavailable', function (string $failure) {
    $this->travelTo(now()->setDate(2026, 9, 26));
    $this->seed(RolePermissionSeeder::class);
    $f = temporaryStayFixture();
    if ($failure === 'rate') {
        ResidenceRate::query()->delete();
    } else {
        $f['room']->update(['status' => 'maintenance']);
    }
    $this->actingAs($f['admin'])->post(route('andalas.temporary-stays.store'), $f['data'])->assertSessionHasErrors();
    $this->assertDatabaseMissing('users', ['email' => $f['data']['email']]);
    $this->assertDatabaseCount('tagihan', 0);
    $this->assertDatabaseCount('penempatan_kamar', 0);
})->with(['rate', 'maintenance']);

it('keeps other residents and maintenance status when a temporary stay ends', function (bool $maintenance) {
    $this->travelTo(now()->setDate(2026, 9, 26));
    $this->seed(RolePermissionSeeder::class);
    $f = temporaryStayFixture();
    $this->actingAs($f['admin'])->post(route('andalas.temporary-stays.store'), $f['data'])->assertSessionHasNoErrors();
    $this->post(route('andalas.temporary-stays.store'), [...$f['data'], 'nama' => 'Peserta kedua', 'nim_nip' => 'PASPOR-456', 'email' => 'kedua@example.test', 'ends_at' => '2026-09-30'])->assertSessionHasNoErrors();
    if ($maintenance) {
        $f['room']->update(['status' => 'maintenance']);
    }
    $this->travelTo(now()->setDate(2026, 9, 28));
    app(EndTemporaryStays::class)->handle();
    expect($f['room']->fresh()->status)->toBe($maintenance ? 'maintenance' : 'terisi_sebagian');
    expect($f['room']->penempatanKamar()->where('status', 'aktif')->count())->toBe(1);
})->with([false, true]);

it('treats a listed local summer participant as a temporary personal payer', function () {
    $this->travelTo(now()->setDate(2026, 9, 26));
    $this->seed(RolePermissionSeeder::class);
    $f = temporaryStayFixture();
    KipkRecipient::create(['nim' => '2612345678', 'angkatan' => 2026, 'nama' => 'Peserta']);
    $f['building']->update(['allowed_categories' => ['local_non_kipk']]);
    $this->actingAs($f['admin'])->post(route('andalas.temporary-stays.store'), [...$f['data'], 'nim_nip' => '2612345678', 'client_profile_category' => 'local_non_kipk'])->assertSessionHasNoErrors();
    $stay = ResidenceRegistration::sole();
    expect(app(ResidenceLifecycle::class)->isBinaan($stay->studentProfile))->toBeFalse();
    expect((float) $stay->tagihan->total)->toBe(200000.0);
});

it('keeps temporary occupants out of the student role, roster and dashboard', function (string $stayKind) {
    $this->travelTo(now()->setDate(2026, 9, 26));
    $this->seed(RolePermissionSeeder::class);
    $f = temporaryStayFixture();

    $this->actingAs($stayKind === 'non_student' ? $f['facilitator'] : $f['admin'])
        ->post(route('andalas.temporary-stays.store'), [...$f['data'], 'stay_kind' => $stayKind])
        ->assertSessionHasNoErrors();

    $occupant = User::where('email', $f['data']['email'])->sole();
    expect($occupant->hasRole('tamu'))->toBeTrue()
        ->and($occupant->hasRole('mahasiswa'))->toBeFalse()
        ->and($occupant->getAllPermissions())->toHaveCount(0);

    $this->actingAs($occupant)->get(route('dashboard.redirect'))->assertForbidden();
    $this->actingAs($occupant)->get(route('mahasiswa.dashboard'))->assertForbidden();

    $this->actingAs($f['admin'])->get(route('admin_layanan.mahasiswa'))
        ->assertInertia(fn (Assert $page) => $page->has('mahasiswa', 0));
    $this->actingAs($f['facilitator'])->get(route('fasilitator.dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('stats.penghuni_aktif', 0));
})->with(['summer_course', 'non_student']);

it('reuses the non-login occupant record when the same person returns', function () {
    $this->travelTo(now()->setDate(2026, 9, 26));
    $this->seed(RolePermissionSeeder::class);
    $f = temporaryStayFixture();
    $this->actingAs($f['admin'])->post(route('andalas.temporary-stays.store'), $f['data'])->assertSessionHasNoErrors();
    $occupant = User::where('email', $f['data']['email'])->sole();

    $this->travelTo(now()->setDate(2026, 9, 29));
    app(EndTemporaryStays::class)->handle();
    $this->post(route('andalas.temporary-stays.store'), [...$f['data'], 'starts_at' => '2026-09-29', 'ends_at' => '2026-10-02'])
        ->assertSessionHasNoErrors();

    expect(User::where('email', $f['data']['email'])->count())->toBe(1)
        ->and(ResidenceRegistration::count())->toBe(2)
        ->and($occupant->fresh()->hasRole('tamu'))->toBeTrue();
});
