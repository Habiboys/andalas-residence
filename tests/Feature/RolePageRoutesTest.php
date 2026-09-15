<?php

use App\Models\MahasiswaProfil;
use App\Models\User;
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

test('checkin submission via inertia follows PRG with a flash toast', function () {
    $user = mahasiswaUser();
    $user->givePermissionTo(Permission::findOrCreate('checkin.create'));

    $this->actingAs($user)
        ->withHeaders(['X-Inertia' => 'true', 'Referer' => route('mahasiswa.checkin')])
        ->post(route('andalas.checkin.store'), ['tanggal_rencana_masuk' => now()->addDay()->format('Y-m-d')])
        ->assertRedirect(route('mahasiswa.checkin'))
        ->assertSessionHas('toast.type', 'success');
});

test('bebas-asrama submission via inertia follows PRG with a flash toast', function () {
    $user = mahasiswaUser();
    $user->givePermissionTo(Permission::findOrCreate('pengajuan.submit'));

    $this->actingAs($user)
        ->withHeaders(['X-Inertia' => 'true', 'Referer' => route('mahasiswa.bebas-asrama')])
        ->post(route('andalas.pengajuan.bebas'), ['alasan' => 'Mau pulang kampung'])
        ->assertRedirect(route('mahasiswa.bebas-asrama'))
        ->assertSessionHas('toast.type', 'success');
});
