<?php

use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;

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
    $kamar = Kamar::create(['lantai_id' => $lantai->id, 'nomor_kamar' => '101', 'kapasitas' => 2, 'status' => 'kosong', 'tipe_kamar' => 'reguler']);

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
    ['lantai' => $lantai] = buildingFixture();

    $this->actingAs($this->admin)
        ->from(route('admin.kelola-bangunan'))
        ->delete(route('andalas.lantai.destroy', $lantai))
        ->assertRedirect(route('admin.kelola-bangunan'))
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
    ['kamar' => $kamar] = buildingFixture();

    $this->actingAs($this->admin)
        ->from(route('admin.kelola-bangunan'))
        ->delete(route('andalas.kamar.destroy', $kamar))
        ->assertRedirect(route('admin.kelola-bangunan'))
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
