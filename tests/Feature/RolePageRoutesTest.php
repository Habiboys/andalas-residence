<?php

use App\Models\Aset;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\Pembayaran;
use App\Models\PenempatanKamar;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function userWithRole(string $role): User
{
    Role::findOrCreate($role);
    $user = User::factory()->create();
    $user->assignRole($role);

    return $user;
}

test('generic app routes no longer exist', function () {
    $this->get('/app')->assertNotFound();
    $this->get('/app/mahasiswa/dashboard')->assertNotFound();
});

test('mahasiswa dashboard renders its concrete inertia component with initial data', function () {
    $this->actingAs(userWithRole('mahasiswa'))
        ->get('/mahasiswa/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('mahasiswa/dashboard')
            ->has('initialUser')
            ->has('stats'));
});

test('a mahasiswa cannot open an admin page', function () {
    $this->actingAs(userWithRole('mahasiswa'))
        ->get('/admin/mahasiswa')
        ->assertForbidden();
});

test('staff admin can open the explicit mahasiswa resource page', function () {
    $this->actingAs(userWithRole('staff_admin'))
        ->get('/admin/mahasiswa')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/data-mahasiswa')
            ->has('mahasiswa'));
});

test('building management only receives the hierarchy needed by its page', function () {
    $this->actingAs(userWithRole('staff_admin'))
        ->get('/admin/kelola-bangunan')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/kelola-bangunan')
            ->has('gedung')
            ->missing('gedung.0.lantai.0.kamar.0.penempatan_kamar'));
});

function mahasiswaUser(): User
{
    $user = userWithRole('mahasiswa');
    MahasiswaProfil::create([
        'user_id' => $user->id,
        'barcode_code' => (string) fake()->unique()->numberBetween(100000, 999999),
    ]);

    return $user;
}

test('mahasiswa pages receive their server-side data via inertia props', function () {
    $user = mahasiswaUser();

    $this->actingAs($user)->get('/mahasiswa/tagihan')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('pembayaran'));

    $this->actingAs($user)->get('/mahasiswa/jadwal')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('kegiatan'));

    $this->actingAs($user)->get('/mahasiswa/absensi')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('absensi'));

    $this->actingAs($user)->get('/mahasiswa/detail-kamar')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('penempatan'));

    $this->actingAs($user)->get('/mahasiswa/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('stats')->has('pembayaran'));
});

test('obsolete checkin endpoints are unavailable', function () {
    $user = mahasiswaUser();

    $this->actingAs($user)->get('/mahasiswa/checkin')->assertNotFound();
    $this->actingAs($user)->post('/andalas/checkin', ['tanggal_rencana_masuk' => now()->toDateString()])->assertNotFound();
    expect(Schema::hasTable('checkin'))->toBeFalse();
});

test('bebas-asrama submission via inertia follows PRG with a flash toast', function () {
    $user = mahasiswaUser();
    $user->givePermissionTo(Permission::findOrCreate('pengajuan.submit'));
    $user->mahasiswaProfil->update(['angkatan' => '2025']);

    $this->actingAs($user)
        ->withHeaders(['X-Inertia' => 'true', 'Referer' => route('mahasiswa.bebas-asrama')])
        ->post(route('andalas.pengajuan.bebas'), ['alasan' => 'Mau pulang kampung'])
        ->assertRedirect(route('mahasiswa.bebas-asrama'))
        ->assertSessionHas('toast.type', 'success');
});

function mappedBuilding(): Gedung
{
    $building = Gedung::create([
        'kode_gedung' => 'MAP-01',
        'nama_gedung' => 'Gedung MAP',
    ]);
    $floor = Lantai::create([
        'gedung_id' => $building->id,
        'nomor_lantai' => 1,
        'nama_lantai' => 'Lantai 1',
    ]);
    Kamar::create([
        'lantai_id' => $floor->id,
        'nomor_kamar' => '101',
        'kapasitas' => 2,
        'status' => 'terisi_sebagian',
    ]);

    return $building;
}

function occupyMappedRoom(Gedung $building, User $student): void
{
    $room = Kamar::firstWhere('nomor_kamar', '101');
    PenempatanKamar::create([
        'mahasiswa_id' => $student->mahasiswaProfil->id,
        'kamar_id' => $room->id,
        'tanggal_mulai' => '2026-08-01',
        'status' => 'aktif',
    ]);
    Aset::create([
        'kamar_id' => $room->id,
        'kode_inventaris' => 'INV-MAP-01',
        'nama_aset' => 'Meja Belajar',
        'kondisi' => 'baik',
    ]);
    Pembayaran::create([
        'kode_transaksi' => 'TRX-MAP-01',
        'mahasiswa_id' => $student->mahasiswaProfil->id,
        'nominal' => 1500000,
        'status' => 'lunas',
        'tanggal_bayar' => now(),
    ]);
}

test('staff room map carries room assets, prodi and the resident billing status', function () {
    $admin = userWithRole('staff_admin');
    occupyMappedRoom(mappedBuilding(), mahasiswaUser());

    $this->actingAs($admin)->get('/admin/pemetaan-kamar')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/pemetaan-kamar')
            ->has('gedung.0.lantai.0.kamar.0.aset', 1)
            ->where('gedung.0.lantai.0.kamar.0.aset.0.nama_aset', 'Meja Belajar')
            ->has('gedung.0.lantai.0.kamar.0.penempatan_kamar.0.mahasiswa.prodi')
            ->where('gedung.0.lantai.0.kamar.0.penempatan_kamar.0.mahasiswa.pembayaran.0.status', 'lunas'));
});

test('mahasiswa room map never exposes assets or billing of other residents', function () {
    $student = mahasiswaUser();
    occupyMappedRoom(mappedBuilding(), $student);

    $this->actingAs($student)->get('/mahasiswa/pemetaan-kamar')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('mahasiswa/pemetaan-kamar')
            ->missing('gedung.0.lantai.0.kamar.0.aset')
            ->missing('gedung.0.lantai.0.kamar.0.penempatan_kamar.0.mahasiswa.pembayaran'));
});

test('placement log feeds its resident detail with complete billing context', function () {
    $admin = userWithRole('staff_admin');
    occupyMappedRoom(mappedBuilding(), mahasiswaUser());

    $this->actingAs($admin)->get('/admin/penempatan-kamar')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/penempatan-kamar')
            ->has('penempatan.0.mahasiswa.pembayaran', 1)
            ->where('penempatan.0.mahasiswa.pembayaran.0.status', 'lunas')
            ->where('penempatan.0.kamar.nomor_kamar', '101')
            ->has('penempatan.0.kamar.lantai.gedung'));
});
