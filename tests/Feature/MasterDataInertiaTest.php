<?php

use App\Models\Faculty;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function masterDataUser(string $role, bool $canManage = true): User
{
    $user = User::factory()->create();
    $user->assignRole(Role::findOrCreate($role));

    if ($canManage) {
        $user->givePermissionTo(Permission::findOrCreate('master.manage'));
    }

    return $user;
}

test('staff admin receives master data as inertia props', function () {
    $this->actingAs(masterDataUser('staff_admin'))
        ->get(route('admin.master-data'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/master-data')
            ->has('fasilitator', 0)
            ->hasAll(['fakultas', 'departemen', 'prodi', 'periode', 'provinsi', 'kota', 'kategori_transaksi']));
});

test('assignment options list facilitators only when the role exists', function () {
    $facilitator = masterDataUser('fasilitator', false);
    masterDataUser('mahasiswa', false);
    $this->actingAs(masterDataUser('staff_admin'))
        ->get(route('admin.master-data'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('fasilitator', 1)->where('fasilitator.0.id', $facilitator->id));
});

test('non admin cannot open or mutate master data', function () {
    $user = masterDataUser('mahasiswa');

    $this->actingAs($user)->get(route('admin.master-data'))->assertForbidden();
    $this->actingAs($user)->post(route('admin.master-data.fakultas.store'), ['name' => 'Teknik'])->assertForbidden();
});

test('master data mutation redirects back with toast', function () {
    $user = masterDataUser('staff_admin');

    $this->actingAs($user)
        ->from(route('admin.master-data'))
        ->post(route('admin.master-data.fakultas.store'), ['name' => 'Teknik'])
        ->assertRedirect(route('admin.master-data'))
        ->assertSessionHas('toast.type', 'success');

    $this->assertDatabaseHas('faculty', ['name' => 'Teknik']);
});

test('master data validation returns inertia-compatible errors', function () {
    $user = masterDataUser('staff_admin');

    $this->actingAs($user)
        ->from(route('admin.master-data'))
        ->post(route('admin.master-data.fakultas.store'), ['name' => ''])
        ->assertRedirect(route('admin.master-data'))
        ->assertSessionHasErrors('name');
});

test('master data update uses route model binding', function () {
    $user = masterDataUser('staff_admin');
    $faculty = Faculty::create(['name' => 'Lama']);

    $this->actingAs($user)
        ->from(route('admin.master-data'))
        ->put(route('admin.master-data.fakultas.update', $faculty), ['name' => 'Baru'])
        ->assertRedirect(route('admin.master-data'));

    expect($faculty->refresh()->name)->toBe('Baru');
});
