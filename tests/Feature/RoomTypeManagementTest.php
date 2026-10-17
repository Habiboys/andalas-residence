<?php

use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\RoomType;
use App\Models\User;
use App\Services\RoomEligibility;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

it('manages a custom type through buildings rooms and tariffs without changing its stored code', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = User::factory()->create()->assignRole('superadmin');
    $this->actingAs($admin);
    $this->post(route('admin.master-data.tipe-kamar.store'), ['code' => 'studio', 'name' => 'Studio keluarga', 'active' => true])->assertSessionHasNoErrors();
    $type = RoomType::where('code', 'studio')->sole();
    $building = Gedung::create(['kode_gedung' => 'NEW', 'nama_gedung' => 'Baru', 'room_types' => []]);
    $this->post(route('andalas.residence-management.save', 'room-type'), ['gedung_id' => $building->id, 'type' => 'studio', 'enabled' => true, 'max_capacity' => 4, 'facilities' => 'AC'])->assertSessionHasNoErrors();
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $this->post(route('andalas.kamar.store'), ['lantai_id' => $floor->id, 'nomor_kamar' => 'S1', 'kapasitas' => 4, 'tipe_kamar' => 'studio'])->assertSessionHasNoErrors();
    $this->post(route('andalas.residence-management.save', 'rate'), ['gedung_id' => $building->id, 'tipe_kamar' => 'studio', 'unit' => 'year', 'amount' => 10000000])->assertSessionHasNoErrors();
    $this->put(route('admin.master-data.tipe-kamar.update', $type), ['name' => 'Studio baru', 'active' => true])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('kamar', ['tipe_kamar' => 'studio']);
    $this->assertDatabaseHas('residence_rates', ['tipe_kamar' => 'studio', 'amount' => 10000000]);
    $this->get(route('admin.master-data-section', 'tipe-kamar'))->assertInertia(fn (Assert $page) => $page->component('admin/master-data')->where('section', 'tipe-kamar')->has('roomTypeCatalog', 6));
    $this->put(route('admin.master-data.tipe-kamar.update', $type), ['name' => 'Studio baru', 'active' => false])->assertSessionHasNoErrors();
    expect(RoomEligibility::allowsType($building->fresh(), 'studio', 4))->toBeFalse();
    expect(RoomEligibility::available()->where('tipe_kamar', 'studio')->exists())->toBeFalse();
    $this->post(route('andalas.kamar.store'), ['lantai_id' => $floor->id, 'nomor_kamar' => 'S2', 'kapasitas' => 4, 'tipe_kamar' => 'studio'])->assertSessionHasErrors('tipe_kamar');
    $this->post(route('andalas.residence-management.save', 'room-type'), ['gedung_id' => $building->id, 'type' => 'studio', 'enabled' => true])->assertSessionHasErrors('type');
    $this->assertDatabaseCount('kamar', 1);
    $this->assertDatabaseCount('residence_rates', 1);
    $this->put(route('andalas.kamar.update', Kamar::sole()), ['nomor_kamar' => 'S1-edited'])->assertSessionHasNoErrors();
});

it('rejects invalid duplicate or changing type codes', function () {
    $this->seed(RolePermissionSeeder::class);
    $this->actingAs(User::factory()->create()->assignRole('superadmin'));
    foreach (['standar', 'INVALID CODE', '../bad'] as $code) {
        $this->post(route('admin.master-data.tipe-kamar.store'), ['code' => $code, 'name' => 'Nama', 'active' => true])->assertSessionHasErrors('code');
    }
    $type = RoomType::where('code', 'standar')->sole();
    $this->put(route('admin.master-data.tipe-kamar.update', $type), ['code' => 'changed', 'name' => 'Nama', 'active' => true])->assertSessionHasErrors('code');
    expect($type->fresh()->code)->toBe('standar');
});

it('denies master type access and mutations to students', function () {
    $this->seed(RolePermissionSeeder::class);
    $this->actingAs(User::factory()->create()->assignRole('mahasiswa'));
    $this->get(route('admin.master-data-section', 'tipe-kamar'))->assertForbidden();
    $this->post(route('admin.master-data.tipe-kamar.store'), ['code' => 'studio', 'name' => 'Studio', 'active' => true])->assertForbidden();
    $this->put(route('admin.master-data.tipe-kamar.update', RoomType::first()), ['name' => 'Changed', 'active' => false])->assertForbidden();
});
