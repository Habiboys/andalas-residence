<?php

use App\Actions\Registration\CompleteResidenceRegistration;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\Periode;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Models\User;
use App\Services\ResidenceMasterImport;
use App\Services\RoomEligibility;
use App\Services\RoomReservations;
use Database\Seeders\ResidenceMasterSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

function catalogRegistrationFixture(): array
{
    $user = User::factory()->student()->create(['gender' => 'perempuan', 'client_profile_category' => 'local_non_kipk'])->assignRole('mahasiswa');
    $profile = MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => fake()->uuid(), 'angkatan' => '2026']);
    $period = Periode::create(['nama_periode' => '2026/2027', 'status' => 'aktif', 'angkatan_maba' => 2026, 'tanggal_mulai' => now(), 'tanggal_selesai' => now()->addYear()]);
    $building = Gedung::create(['kode_gedung' => 'CAT', 'nama_gedung' => 'Katalog', 'allowed_categories' => ['local_non_kipk', 'student'], 'room_types' => [['type' => 'standar', 'enabled' => true, 'max_capacity' => 2, 'facilities' => 'Dipan']]]);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => '101', 'kapasitas' => 2, 'status' => 'kosong', 'tipe_kamar' => 'standar']);
    ResidenceRate::create(['gedung_id' => $building->id, 'tipe_kamar' => 'standar', 'unit' => 'year', 'amount' => 2500000, 'room_amount' => 5000000]);
    $input = ['periode_id' => $period->id, 'preferences' => [['kamar_id' => $room->id]], 'rate_unit' => 'year'];

    return compact('user', 'profile', 'period', 'building', 'room', 'input');
}

it('imports checked and unchecked types capacities facilities and exact occupant categories for RPX', function () {
    $this->seed(ResidenceMasterSeeder::class);
    $building = Gedung::where('kode_gedung', 'A')->sole();
    expect($building->allowed_categories)->toBe(['local_kipk', 'local_non_kipk', 'student', 'non_student', 'summer_course']);
    $types = collect($building->room_types)->keyBy('type');
    expect($types['standar'])->toBe(['type' => 'standar', 'enabled' => true, 'max_capacity' => 2, 'facilities' => 'Dipan, Lemari, Meja Belajar'])
        ->and($types['umum']['enabled'])->toBeTrue()
        ->and($types['premium']['enabled'])->toBeFalse()
        ->and($types['medium']['enabled'])->toBeFalse();
    $h = Gedung::where('kode_gedung', 'H')->sole();
    expect(Kamar::whereHas('lantai', fn ($q) => $q->where('gedung_id', $h->id))->whereIn('nomor_kamar', ['102', '311'])->pluck('status')->all())->toBe(['maintenance', 'maintenance']);
});

it('retains enabled types without tariffs and tariffs provided only per room', function () {
    $book = new Spreadsheet;
    $sheet = $book->getActiveSheet()->setTitle('Test (T)');
    $sheet->setCellValue('G13', 'Premium')->setCellValue('J13', true)->setCellValue('I13', '2 Orang')->setCellValue('H13', 'AC');
    $sheet->setCellValue('G14', 'Medium')->setCellValue('J14', true)->setCellValue('K14', 5000000);
    $path = tempnam(sys_get_temp_dir(), 'room-catalog-');
    try {
        (new Xlsx($book))->save($path);
        $import = app(ResidenceMasterImport::class);
        $data = $import->read($path);
        $import->apply($data['buildings']);
        expect(Gedung::sole()->room_types)->toHaveCount(2);
        $this->assertDatabaseHas('residence_rates', ['tipe_kamar' => 'medium', 'unit' => 'year', 'amount' => 0, 'room_amount' => 5000000]);
        $sheet->setCellValue('K14', null);
        (new Xlsx($book))->save($path);
        $import->apply($import->read($path)['buildings']);
        $this->assertDatabaseCount('residence_rates', 0);
        expect(Gedung::sole()->room_types)->toHaveCount(2);
    } finally {
        unlink($path);
        $book->disconnectWorksheets();
    }
});

it('rolls back the entire master sync when an inconsistent source room has active occupants', function () {
    $this->seed(ResidenceMasterSeeder::class);
    $building = Gedung::where('kode_gedung', 'H')->sole();
    $room = Kamar::whereHas('lantai', fn ($query) => $query->where('gedung_id', $building->id))->where('nomor_kamar', '102')->sole();
    $user = User::factory()->student()->create();
    $student = MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => fake()->uuid()]);
    PenempatanKamar::create(['mahasiswa_id' => $student->id, 'kamar_id' => $room->id, 'tanggal_mulai' => now(), 'status' => 'aktif']);
    $building->update(['nama_gedung' => 'Nama dipertahankan']);
    $rpx = Gedung::where('kode_gedung', 'A')->sole();
    $rpx->update(['nama_gedung' => 'RPX sebelum impor']);
    expect(fn () => $this->seed(ResidenceMasterSeeder::class))->toThrow(LogicException::class);
    expect($building->fresh()->nama_gedung)->toBe('Nama dipertahankan')
        ->and($rpx->fresh()->nama_gedung)->toBe('RPX sebelum impor');
    $this->assertDatabaseCount('penempatan_kamar', 1);
});

it('rejects unavailable types and excess capacity through both room administration endpoints', function (string $type, int $capacity) {
    $this->seed(RolePermissionSeeder::class);
    $f = catalogRegistrationFixture();
    $admin = User::factory()->create()->assignRole('superadmin');
    $data = ['gedung_id' => $f['building']->id, 'nomor_lantai' => 1, 'nomor_kamar' => 'NEW', 'tipe_kamar' => $type, 'kapasitas' => $capacity, 'status' => 'kosong'];
    $this->actingAs($admin)->post(route('andalas.residence-management.save', 'room'), $data)->assertSessionHasErrors('tipe_kamar');
    $this->post(route('andalas.kamar.store'), [...$data, 'lantai_id' => $f['room']->lantai_id])->assertSessionHasErrors('tipe_kamar');
    $this->put(route('andalas.kamar.update', $f['room']->id), ['tipe_kamar' => $type, 'kapasitas' => $capacity])->assertSessionHasErrors('tipe_kamar');
    $this->assertDatabaseCount('kamar', 1);
    expect($f['room']->fresh()->kapasitas)->toBe(2);
})->with(['inactive type' => ['premium', 2], 'capacity above maximum' => ['standar', 3]]);

it('saves room type availability and facilities separately from tariffs', function () {
    $this->seed(RolePermissionSeeder::class);
    $f = catalogRegistrationFixture();
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $data = ['gedung_id' => $f['building']->id, 'type' => 'premium', 'enabled' => true, 'max_capacity' => 2, 'facilities' => 'AC'];
    $this->actingAs($admin)->post(route('andalas.residence-management.save', 'room-type'), $data)->assertSessionHasNoErrors();
    $this->post(route('andalas.residence-management.save', 'room-type'), [...$data, 'enabled' => false])->assertSessionHasNoErrors();
    expect($f['building']->fresh()->room_types)->toHaveCount(2);
    expect(RoomEligibility::allowsType($f['building']->fresh(), 'premium'))->toBeFalse();
    $this->get(route('admin_layanan.residence-management'))->assertInertia(fn (Assert $page) => $page->where('gedung.0.room_types.1.enabled', false)->where('gedung.0.room_types.1.facilities', 'AC'));
    $this->assertDatabaseCount('residence_rates', 1);
    $this->post(route('andalas.residence-management.save', 'rate'), ['gedung_id' => $f['building']->id, 'tipe_kamar' => 'premium', 'unit' => 'year', 'amount' => 1000000])->assertSessionHasErrors('tipe_kamar');
    $this->post(route('andalas.residence-management.save', 'rate'), ['gedung_id' => $f['building']->id, 'tipe_kamar' => 'standar', 'unit' => 'year', 'amount' => 2500000, 'facilities' => 'Fasilitas berbeda'])->assertSessionHasNoErrors();
    expect(ResidenceRate::sole()->facilities)->toBe('Dipan');
    $this->actingAs($f['user'])->post(route('andalas.residence-management.save', 'room-type'), $data)->assertForbidden();
});

it('treats an empty category list as closed and never falls back from nonmaba to maba', function () {
    $this->seed(RolePermissionSeeder::class);
    $f = catalogRegistrationFixture();
    $f['building']->update(['allowed_categories' => []]);
    expect(RoomEligibility::allows($f['building']->fresh(), $f['user']))->toBeFalse();
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $this->actingAs($admin)->post(route('andalas.residence-management.save', 'building'), ['gedung_id' => $f['building']->id, 'allowed_categories' => []])->assertSessionHasNoErrors();
    expect($f['building']->fresh()->allowed_categories)->toBe([]);
    $this->actingAs($f['user'])->post(route('andalas.registrations.store'), $f['input'])->assertSessionHasErrors('preferences');
    $f['building']->update(['allowed_categories' => ['local_non_kipk']]);
    $f['profile']->update(['angkatan' => '2025']);
    expect(RoomEligibility::allows($f['building']->fresh(), $f['user']->fresh()))->toBeFalse();
    $f['building']->update(['allowed_categories' => ['student']]);
    expect(RoomEligibility::allows($f['building']->fresh(), $f['user']->fresh()))->toBeTrue();
});

it('charges the selected annual basis and protects an exclusive room before and after placement', function (string $basis, float $amount, int $reserved) {
    Queue::fake();
    $this->seed(RolePermissionSeeder::class);
    $f = catalogRegistrationFixture();
    $this->actingAs($f['user'])->post(route('andalas.registrations.store'), [...$f['input'], 'billing_basis' => $basis])->assertSessionHasNoErrors();
    $registration = ResidenceRegistration::sole();
    expect((float) $registration->tagihan->total)->toBe($amount)
        ->and($registration->tagihan->residence_snapshot['billing_basis'])->toBe($basis)
        ->and(app(RoomReservations::class)->count($f['room']))->toBe($reserved);
    $registration->tagihan->update(['status' => 'lunas', 'total_dibayar' => $amount]);
    app(CompleteResidenceRegistration::class)->handle($registration);
    expect($f['room']->fresh()->status)->toBe($basis === 'room' ? 'penuh' : 'terisi_sebagian');
    expect(app(RoomReservations::class)->count($f['room']))->toBe($basis === 'room' ? 1 : 0);
    $registration->fresh()->placement->update(['status' => 'berakhir']);
    expect(app(RoomReservations::class)->count($f['room']))->toBe(0);
})->with(['person' => ['person', 2500000.0, 1], 'room' => ['room', 5000000.0, 2]]);

it('rolls back registration when the per room tariff is unavailable', function () {
    $this->seed(RolePermissionSeeder::class);
    $f = catalogRegistrationFixture();
    ResidenceRate::query()->update(['room_amount' => null]);
    $this->actingAs($f['user'])->post(route('andalas.registrations.store'), [...$f['input'], 'billing_basis' => 'room'])->assertSessionHasErrors('billing_basis');
    $this->assertDatabaseCount('residence_registrations', 0);
    $this->assertDatabaseCount('tagihan', 0);
});

it('refuses whole room rental when another bed has been reserved and refuses monthly room basis', function () {
    $this->seed(RolePermissionSeeder::class);
    $f = catalogRegistrationFixture();
    ResidenceRegistration::create(['student_profile_id' => $f['profile']->id, 'periode_id' => $f['period']->id, 'status' => 'submitted', 'reserved_room_id' => $f['room']->id, 'reservation_expires_at' => now()->addHour()]);
    $this->actingAs($f['user'])->post(route('andalas.registrations.store'), [...$f['input'], 'billing_basis' => 'room'])->assertSessionHasErrors('preferences');
    $this->post(route('andalas.registrations.store'), [...$f['input'], 'billing_basis' => 'room', 'rate_unit' => 'month', 'starts_at' => now()->toDateString(), 'ends_at' => now()->addMonth()->toDateString()])->assertSessionHasErrors('billing_basis');
});

it('hides invalid existing room types and refuses disabling types used by a reservation', function () {
    $this->seed(RolePermissionSeeder::class);
    $f = catalogRegistrationFixture();
    $f['room']->update(['tipe_kamar' => 'premium']);
    $this->actingAs($f['user'])->get(route('mahasiswa.registration'))->assertInertia(fn (Assert $page) => $page->has('rooms', 0));
    $this->post(route('andalas.registrations.store'), $f['input'])->assertSessionHasErrors('preferences');
    $f['room']->update(['tipe_kamar' => 'standar']);
    $this->post(route('andalas.registrations.store'), $f['input'])->assertSessionHasNoErrors();
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $this->actingAs($admin)->post(route('andalas.residence-management.save', 'room-type'), ['gedung_id' => $f['building']->id, 'type' => 'standar', 'enabled' => false])->assertSessionHasErrors('type');
    expect(RoomEligibility::allowsType($f['building']->fresh(), 'standar'))->toBeTrue();
});
