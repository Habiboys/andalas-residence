<?php

use App\Models\Aset;
use App\Models\FasilitasUmum;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\ResidenceRate;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->withoutVite();
    $this->freezeTime();
    $this->admin = User::factory()->create()->assignRole('staff_admin');
});

function buildingFixture(): array
{
    $gedung = Gedung::create(['kode_gedung' => 'CRUD-1', 'nama_gedung' => 'Gedung CRUD']);
    $lantai = Lantai::create(['gedung_id' => $gedung->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $kamar = Kamar::create(['lantai_id' => $lantai->id, 'nomor_kamar' => '101', 'kapasitas' => 2, 'status' => 'kosong', 'tipe_kamar' => 'standar']);

    return compact('gedung', 'lantai', 'kamar');
}

function occupyRoom(Kamar $kamar): void
{
    $user = User::factory()->student()->create()->assignRole('mahasiswa');
    $student = MahasiswaProfil::create([
        'user_id' => $user->id,
        'barcode_code' => fake()->uuid(),
        'angkatan' => '2024',
        'tanggal_masuk' => now()->subMonth(),
        'status_huni' => 'aktif',
    ]);

    PenempatanKamar::create([
        'mahasiswa_id' => $student->id,
        'kamar_id' => $kamar->id,
        'tanggal_mulai' => now()->subMonth(),
        'status' => 'aktif',
    ]);
}

test('kamar medium dapat dibuat dan diperbarui tanpa kehilangan tarif', function () {
    ['lantai' => $lantai] = buildingFixture();
    $this->actingAs($this->admin)->post(route('andalas.kamar.store'), [
        'lantai_id' => $lantai->id, 'nomor_kamar' => 'MEDIUM-01', 'kapasitas' => 2,
        'tipe_kamar' => 'medium', 'tarif_per_periode' => 1800000,
    ])->assertSessionHasNoErrors();
    $room = Kamar::where('nomor_kamar', 'MEDIUM-01')->sole();
    expect($room->tipe_kamar)->toBe('medium')->and((int) $room->tarif_per_periode)->toBe(1800000);
    $this->put(route('andalas.kamar.update', $room), ['tipe_kamar' => 'medium', 'tarif_per_periode' => 1900000])
        ->assertSessionHasNoErrors();
    expect((int) $room->fresh()->tarif_per_periode)->toBe(1900000);
});

test('lantai dapat diubah melalui endpoint update', function () {
    ['lantai' => $lantai] = buildingFixture();

    $this->actingAs($this->admin)
        ->from(route('admin.kelola-bangunan'))
        ->put(route('andalas.lantai.update', $lantai), ['nomor_lantai' => 2, 'nama_lantai' => 'Lantai Dua'])
        ->assertRedirect(route('admin.kelola-bangunan'))
        ->assertSessionHas('toast.type', 'success');

    expect($lantai->fresh()->toArray())->toMatchArray(['nomor_lantai' => 2, 'nama_lantai' => 'Lantai Dua']);
});

test('lantai dapat dihapus selama tidak ada kamar berpenghuni', function () {
    ['gedung' => $gedung, 'lantai' => $lantai] = buildingFixture();

    $this->actingAs($this->admin)
        ->from(route('admin.kelola-bangunan'))
        ->delete(route('andalas.lantai.destroy', $lantai))
        ->assertRedirect(route('andalas.gedung.show', $gedung))
        ->assertSessionHas('toast.type', 'success');

    expect(Lantai::find($lantai->id))->toBeNull();
    expect(Kamar::count())->toBe(0);
});

test('lantai dengan kamar berpenghuni tidak dapat dihapus', function () {
    ['lantai' => $lantai, 'kamar' => $kamar] = buildingFixture();
    occupyRoom($kamar);

    $this->actingAs($this->admin)
        ->from(route('admin.kelola-bangunan'))
        ->delete(route('andalas.lantai.destroy', $lantai))
        ->assertRedirect(route('admin.kelola-bangunan'))
        ->assertSessionHas('toast.type', 'error');

    expect(Lantai::find($lantai->id))->not->toBeNull();
});

test('kamar berpenghuni tidak dapat dihapus', function () {
    ['kamar' => $kamar] = buildingFixture();
    occupyRoom($kamar);

    $this->actingAs($this->admin)
        ->from(route('admin.kelola-bangunan'))
        ->delete(route('andalas.kamar.destroy', $kamar))
        ->assertRedirect(route('admin.kelola-bangunan'))
        ->assertSessionHas('toast.type', 'error');

    expect(Kamar::find($kamar->id))->not->toBeNull();
});

test('kamar kosong dapat dihapus', function () {
    ['lantai' => $lantai, 'kamar' => $kamar] = buildingFixture();

    $this->actingAs($this->admin)
        ->from(route('admin.kelola-bangunan'))
        ->delete(route('andalas.kamar.destroy', $kamar))
        ->assertRedirect(route('andalas.lantai.show', $lantai))
        ->assertSessionHas('toast.type', 'success');

    expect(Kamar::find($kamar->id))->toBeNull();
});

test('gedung dengan kamar berpenghuni tidak dapat dihapus', function () {
    ['gedung' => $gedung, 'kamar' => $kamar] = buildingFixture();
    occupyRoom($kamar);

    $this->actingAs($this->admin)
        ->from(route('admin.kelola-bangunan'))
        ->delete(route('andalas.gedung.destroy', $gedung))
        ->assertRedirect(route('admin.kelola-bangunan'))
        ->assertSessionHas('toast.type', 'error');

    expect(Gedung::find($gedung->id))->not->toBeNull();
});

test('gedung dapat dibuat dengan upload foto', function () {
    $file = UploadedFile::fake()->image('gedung.jpg');

    $this->actingAs($this->admin)
        ->from(route('admin.kelola-bangunan'))
        ->post(route('andalas.gedung.store'), [
            'kode_gedung' => 'FOTO-1',
            'nama_gedung' => 'Gedung Berfoto',
            'gender_peruntukan' => 'laki_laki',
            'foto' => $file,
        ])
        ->assertRedirect(route('admin.kelola-bangunan'))
        ->assertSessionHas('toast.type', 'success');

    expect(Gedung::where('kode_gedung', 'FOTO-1')->value('foto'))->toMatch('/^gedung\//');
});

test('edit gedung tanpa foto baru mempertahankan foto lama', function () {
    ['gedung' => $gedung] = buildingFixture();
    $gedung->update(['foto' => 'gedung/lama.jpg']);

    $this->actingAs($this->admin)
        ->from(route('admin.kelola-bangunan'))
        ->put(route('andalas.gedung.update', $gedung), ['nama_gedung' => 'Gedung Diubah'])
        ->assertRedirect(route('admin.kelola-bangunan'))
        ->assertSessionHas('toast.type', 'success');

    expect($gedung->fresh()->foto)->toBe('gedung/lama.jpg');
});

test('mutasi gedung, lantai, dan kamar membutuhkan permission gedung.manage', function () {
    $user = User::factory()->create()->assignRole('mahasiswa');
    ['gedung' => $gedung, 'lantai' => $lantai, 'kamar' => $kamar] = buildingFixture();

    $this->actingAs($user)
        ->post(route('andalas.gedung.store'), ['kode_gedung' => 'DENY', 'nama_gedung' => 'Ditolak'])
        ->assertForbidden();
    $this->actingAs($user)->put(route('andalas.lantai.update', $lantai), ['nama_lantai' => 'X'])->assertForbidden();
    $this->actingAs($user)->delete(route('andalas.lantai.destroy', $lantai))->assertForbidden();
    $this->actingAs($user)->delete(route('andalas.kamar.destroy', $kamar))->assertForbidden();
    $this->actingAs($user)->delete(route('andalas.gedung.destroy', $gedung))->assertForbidden();
});

test('create gedung memakai halaman khusus dan melanjutkan ke pengaturan gedung', function () {
    $this->actingAs($this->admin)->get(route('andalas.gedung.create'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/building-create'));

    $this->post(route('andalas.gedung.store'), [
        'kode_gedung' => 'NEW', 'nama_gedung' => 'Gedung Baru', 'gender_peruntukan' => 'campur',
        'allowed_categories' => ['student', 'non_student'], 'continue_setup' => true,
    ])->assertSessionHasNoErrors()->assertRedirect(route('andalas.gedung.show', Gedung::where('kode_gedung', 'NEW')->sole()));
    expect(Gedung::where('kode_gedung', 'NEW')->sole()->allowed_categories)->toBe(['student', 'non_student']);

    $this->actingAs(User::factory()->create()->assignRole('mahasiswa'))
        ->get(route('andalas.gedung.create'))->assertForbidden();
});

test('kategori gedung dapat dikosongkan termasuk ketika mengirim foto multipart', function () {
    Storage::fake('public');
    ['gedung' => $building] = buildingFixture();
    $building->update(['allowed_categories' => ['student']]);
    $this->actingAs($this->admin)->post(route('andalas.gedung.update', $building), [
        '_method' => 'put', 'configure_categories' => true, 'foto' => UploadedFile::fake()->image('gedung.jpg'),
    ])->assertSessionHasNoErrors();
    expect($building->fresh()->allowed_categories)->toBe([]);
    Storage::disk('public')->assertExists($building->fresh()->foto);
    $this->put(route('andalas.gedung.update', $building), ['allowed_categories' => ['invalid']])->assertSessionHasErrors('allowed_categories.0');
    expect($building->fresh()->allowed_categories)->toBe([]);
});

test('foto kamar dapat diunggah diganti dipertahankan dan dihapus', function () {
    Storage::fake('public');
    ['lantai' => $floor] = buildingFixture();
    $this->actingAs($this->admin)->post(route('andalas.kamar.store'), [
        'lantai_id' => $floor->id, 'nomor_kamar' => 'PHOTO', 'kapasitas' => 2,
        'tipe_kamar' => 'standar', 'foto' => UploadedFile::fake()->image('kamar.jpg'),
    ])->assertSessionHasNoErrors();
    $room = Kamar::where('nomor_kamar', 'PHOTO')->sole();
    $original = $room->foto;
    Storage::disk('public')->assertExists($original);
    $this->put(route('andalas.kamar.update', $room), ['nomor_kamar' => 'PHOTO-EDIT'])->assertSessionHasNoErrors();
    expect($room->fresh()->foto)->toBe($original);
    $this->post(route('andalas.kamar.update', $room), ['_method' => 'put', 'foto' => UploadedFile::fake()->image('baru.webp')])->assertSessionHasNoErrors();
    $replacement = $room->fresh()->foto;
    Storage::disk('public')->assertMissing($original);
    Storage::disk('public')->assertExists($replacement);
    $this->put(route('andalas.kamar.update', $room), ['remove_foto' => true])->assertSessionHasNoErrors();
    expect($room->fresh()->foto)->toBeNull();
    Storage::disk('public')->assertMissing($replacement);
});

test('upload foto kamar menolak file berbahaya terlalu besar dan pengguna tanpa izin', function () {
    Storage::fake('public');
    ['kamar' => $room] = buildingFixture();
    foreach ([UploadedFile::fake()->create('script.php', 1, 'application/x-php'), UploadedFile::fake()->image('besar.jpg')->size(2049)] as $file) {
        $this->actingAs($this->admin)->post(route('andalas.kamar.update', $room), ['_method' => 'put', 'foto' => $file])->assertSessionHasErrors('foto');
    }
    $this->actingAs(User::factory()->create()->assignRole('mahasiswa'))->post(route('andalas.kamar.update', $room), [
        '_method' => 'put', 'foto' => UploadedFile::fake()->image('ditolak.jpg'),
    ])->assertForbidden();
    expect($room->fresh()->foto)->toBeNull();
    expect(Storage::disk('public')->allFiles())->toBe([]);
});

test('pengelola gedung dapat mengatur tipe dan tarif tanpa permission layanan', function () {
    ['gedung' => $building] = buildingFixture();
    $this->admin->syncRoles([])->givePermissionTo('gedung.manage');
    $this->actingAs($this->admin)->post(route('andalas.residence-management.save', 'room-type'), [
        'gedung_id' => $building->id, 'type' => 'standar', 'enabled' => true, 'max_capacity' => 2, 'facilities' => 'Dipan, Lemari',
    ])->assertSessionHasNoErrors();
    expect(collect($building->fresh()->room_types)->firstWhere('type', 'medium')['enabled'])->toBeTrue();
    $rate = ['gedung_id' => $building->id, 'tipe_kamar' => 'standar', 'unit' => 'year', 'amount' => 2500000, 'student_amount' => null, 'room_amount' => 5000000];
    $this->post(route('andalas.residence-management.save', 'rate'), $rate)->assertSessionHasNoErrors();
    $this->post(route('andalas.residence-management.save', 'rate'), [...$rate, 'amount' => 3000000])->assertSessionHasNoErrors();
    expect(ResidenceRate::sole()->amount)->toBe(3000000)->and(ResidenceRate::sole()->facilities)->toBe('Dipan, Lemari');
    $this->delete(route('andalas.residence-management.destroy', 'rate'), $rate)->assertSessionHasNoErrors();
    $this->assertDatabaseCount('residence_rates', 0);
});

test('fasilitas umum dapat dikelola dan tidak bisa dipindahkan lintas gedung atau dihapus dengan aset', function () {
    ['gedung' => $building, 'lantai' => $floor] = buildingFixture();
    $other = Gedung::create(['kode_gedung' => 'OTHER', 'nama_gedung' => 'Gedung Lain']);
    $otherFloor = Lantai::create(['gedung_id' => $other->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai Lain']);
    $data = ['gedung_id' => $building->id, 'lantai_id' => $floor->id, 'nama_fasilitas' => 'Dapur', 'kategori' => 'Area bersama', 'kondisi' => 'baik'];
    $this->actingAs($this->admin)->post(route('andalas.residence-management.save', 'facility'), $data)->assertSessionHasNoErrors();
    $facility = FasilitasUmum::sole();
    $this->post(route('andalas.residence-management.save', 'facility'), [...$data, 'id' => $facility->id, 'nama_fasilitas' => 'Dapur bersama'])->assertSessionHasNoErrors();
    expect($facility->fresh()->nama_fasilitas)->toBe('Dapur bersama');
    $this->post(route('andalas.residence-management.save', 'facility'), [...$data, 'id' => $facility->id, 'lantai_id' => $otherFloor->id])->assertSessionHasErrors('lantai_id');
    $this->post(route('andalas.residence-management.save', 'facility'), [...$data, 'id' => $facility->id, 'gedung_id' => $other->id, 'lantai_id' => null])->assertNotFound();
    $asset = Aset::create(['fasilitas_umum_id' => $facility->id, 'nama_aset' => 'Kompor', 'kategori' => 'Dapur', 'kode_inventaris' => 'TEST-KOMPOR', 'kondisi' => 'baik', 'jumlah' => 1]);
    $this->delete(route('andalas.residence-management.destroy', 'facility'), ['gedung_id' => $building->id, 'id' => $facility->id])->assertSessionHasErrors('facility');
    expect($facility->fresh())->not->toBeNull();
    $asset->delete();
    $this->delete(route('andalas.residence-management.destroy', 'facility'), ['gedung_id' => $building->id, 'id' => $facility->id])->assertSessionHasNoErrors();
    $this->assertDatabaseMissing('fasilitas_umum', ['id' => $facility->id]);
    $this->actingAs(User::factory()->create()->assignRole('mahasiswa'))->post(route('andalas.residence-management.save', 'facility'), $data)->assertForbidden();
});
