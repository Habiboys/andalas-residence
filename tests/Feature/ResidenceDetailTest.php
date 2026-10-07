<?php

use App\Models\Aset;
use App\Models\FasilitasUmum;
use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\ResidenceRate;
use App\Models\StokAset;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function residenceDetailFixture(): array
{
    $building = Gedung::create(['kode_gedung' => 'DETAIL', 'nama_gedung' => 'Gedung Detail', 'room_types' => [['type' => 'standar', 'enabled' => true, 'max_capacity' => 2, 'facilities' => 'Dipan, Lemari']], 'allowed_categories' => ['student']]);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => '101', 'tipe_kamar' => 'standar', 'kapasitas' => 2, 'status' => 'terisi_sebagian']);
    $user = User::factory()->student()->create(['nama' => 'Penghuni Detail']);
    $student = MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => fake()->uuid(), 'nik' => 'DATA-PRIBADI', 'angkatan' => '2026']);
    $placement = PenempatanKamar::create(['mahasiswa_id' => $student->id, 'kamar_id' => $room->id, 'tanggal_mulai' => now(), 'status' => 'aktif']);
    $stock = StokAset::create(['kode' => 'LEMARI', 'nama' => 'Lemari', 'kategori' => 'Furniture', 'satuan' => 'unit', 'jumlah_total' => 10]);
    $asset = Aset::create(['stok_aset_id' => $stock->id, 'nama_aset' => 'Lemari', 'kategori' => 'Furniture', 'kamar_id' => $room->id, 'kode_inventaris' => 'INV-101', 'kondisi' => 'baik', 'jumlah' => 2]);
    FasilitasUmum::create(['gedung_id' => $building->id, 'lantai_id' => $floor->id, 'nama_fasilitas' => 'Dapur bersama', 'kategori' => 'dapur', 'kondisi' => 'baik']);
    ResidenceRate::create(['gedung_id' => $building->id, 'tipe_kamar' => 'standar', 'unit' => 'year', 'amount' => 2500000]);

    return compact('building', 'floor', 'room', 'student', 'asset', 'placement');
}

it('opens building floor and room pages with real assets occupants and master facilities', function () {
    $this->seed(RolePermissionSeeder::class);
    $f = residenceDetailFixture();
    $admin = User::factory()->create()->assignRole('admin_aset');
    $this->actingAs($admin)->get(route('andalas.gedung.show', $f['building']))->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/residence-detail')->where('kind', 'building')->where('can_manage', true)->where('building.lantai.0.kamar.0.occupants_count', 1)->where('building.lantai.0.kamar.0.aset_count', 1)->has('building.fasilitas_umum', 1));
    $this->get(route('andalas.lantai.show', $f['floor']))->assertOk()->assertInertia(fn (Assert $page) => $page->where('kind', 'floor')->where('floor.gedung.id', $f['building']->id)->has('floor.kamar', 1)->has('facilities', 1));
    $this->get(route('andalas.kamar.show', $f['room']))->assertOk()->assertInertia(fn (Assert $page) => $page->where('kind', 'room')->where('type_definition.facilities', 'Dipan, Lemari')->where('room.aset.0.id', $f['asset']->id)->where('room.penempatan_kamar.0.mahasiswa.user.nama', 'Penghuni Detail')->missing('room.penempatan_kamar.0.mahasiswa.nik')->has('rates', 1));
    $this->get(route('andalas.aset.show', $f['asset']))->assertOk()->assertInertia(fn (Assert $page) => $page->where('asset.kamar.id', $f['room']->id)->where('asset.stok_aset.kode', 'LEMARI'));
    $this->get(route('andalas.mahasiswa.show', $f['student']))->assertOk()->assertInertia(fn (Assert $page) => $page->where('profile_summary', null)->where('resident.placements.0.kamar.id', $f['room']->id));
});

it('shows complete profile only to users with student viewing permission', function () {
    $this->seed(RolePermissionSeeder::class);
    $f = residenceDetailFixture();
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $this->actingAs($admin)->get(route('andalas.mahasiswa.show', $f['student']))->assertOk()->assertInertia(fn (Assert $page) => $page->where('resident.nama', 'Penghuni Detail')->has('profile_summary.sections')->where('can_manage', false));
});

it('refuses detail routes without permission and redirects unauthenticated visitors', function (string $kind, string $key) {
    $this->seed(RolePermissionSeeder::class);
    $f = residenceDetailFixture();
    $url = route('andalas.'.$kind.'.show', $f[$key]);
    $this->get($url)->assertRedirect(route('login'));
    $user = User::factory()->student()->create()->assignRole('mahasiswa');
    $this->actingAs($user)->get($url)->assertForbidden();
})->with(['building' => ['gedung', 'building'], 'floor' => ['lantai', 'floor'], 'room' => ['kamar', 'room'], 'asset' => ['aset', 'asset'], 'resident' => ['mahasiswa', 'student']]);

it('restricts facilitators to their assigned building and its occupants and assets', function () {
    $this->seed(RolePermissionSeeder::class);
    $f = residenceDetailFixture();
    $facilitator = User::factory()->create()->assignRole('fasilitator');
    foreach (['gedung' => 'building', 'lantai' => 'floor', 'kamar' => 'room', 'aset' => 'asset', 'mahasiswa' => 'student'] as $kind => $key) {
        $this->actingAs($facilitator)->get(route('andalas.'.$kind.'.show', $f[$key]))->assertForbidden();
    }
    FasilitatorWilayah::create(['user_id' => $facilitator->id, 'gedung_id' => $f['building']->id]);
    foreach (['gedung' => 'building', 'lantai' => 'floor', 'kamar' => 'room', 'aset' => 'asset', 'mahasiswa' => 'student'] as $kind => $key) {
        $this->get(route('andalas.'.$kind.'.show', $f[$key]))->assertOk()->assertInertia(fn (Assert $page) => $page->where('can_manage', false));
    }
});

it('supports rooms without assets occupants or master type data and returns 404 for missing records', function () {
    $this->seed(RolePermissionSeeder::class);
    $f = residenceDetailFixture();
    $f['asset']->delete();
    $f['placement']->delete();
    $f['building']->update(['room_types' => null]);
    $admin = User::factory()->create()->assignRole('admin_aset');
    $this->actingAs($admin)->get(route('andalas.kamar.show', $f['room']))->assertOk()->assertInertia(fn (Assert $page) => $page->has('room.aset', 0)->has('room.penempatan_kamar', 0)->where('type_definition', null));
    $this->get(route('andalas.kamar.show', fake()->uuid()))->assertNotFound();
});

it('returns to the parent page after deleting a room or floor from its detail page', function () {
    $this->seed(RolePermissionSeeder::class);
    $f = residenceDetailFixture();
    $f['asset']->delete();
    $f['placement']->delete();
    $admin = User::factory()->create()->assignRole('admin_aset');
    $this->actingAs($admin)->from(route('andalas.kamar.show', $f['room']))->delete(route('andalas.kamar.destroy', $f['room']))->assertRedirect(route('andalas.lantai.show', $f['floor']));
    $this->assertDatabaseMissing('kamar', ['id' => $f['room']->id]);
    $this->from(route('andalas.lantai.show', $f['floor']))->delete(route('andalas.lantai.destroy', $f['floor']))->assertRedirect(route('andalas.gedung.show', $f['building']));
    $this->assertDatabaseMissing('lantai', ['id' => $f['floor']->id]);
});
