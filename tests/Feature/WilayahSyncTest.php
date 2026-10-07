<?php

use App\Models\City;
use App\Models\Province;
use App\Models\User;
use App\Services\WilayahSyncService;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Http::preventStrayRequests();
});

function wilayahAdmin(bool $allowed = true): User
{
    $user = User::factory()->create();
    $user->assignRole(Role::findOrCreate('staff_admin'));
    if ($allowed) {
        $user->givePermissionTo(Permission::findOrCreate('master.manage'));
    }

    return $user;
}

function fakeWilayah(): void
{
    Http::fake([
        'wilayah.id/api/provinces.json' => Http::response(['data' => [['code' => '13', 'name' => 'Sumatera Barat']]]),
        'wilayah.id/api/regencies/13.json' => Http::response(['data' => [['code' => '13.71', 'name' => 'Kota Padang'], ['code' => '13.72', 'name' => 'Kota Solok']]]),
    ]);
}

test('sync imports public regions and reuses existing ids without deleting legacy data', function () {
    $province = Province::create(['name' => 'SUMATERA BARAT']);
    $city = City::create(['name' => 'Kota Padang', 'province_id' => $province->id]);
    $legacy = City::create(['name' => 'Wilayah lama', 'province_id' => $province->id]);
    fakeWilayah();
    $destination = route('admin.master-data-section', ['section' => 'provinsi']);
    $this->actingAs(wilayahAdmin())->from($destination)
        ->post(route('admin.master-data.wilayah.sync'))
        ->assertRedirect($destination)->assertSessionHas('toast.type', 'success');

    $this->assertDatabaseHas('provinces', ['id' => $province->id, 'wilayah_code' => '13', 'name' => 'Sumatera Barat']);
    $this->assertDatabaseHas('cities', ['id' => $city->id, 'province_id' => $province->id, 'wilayah_code' => '13.71']);
    $this->assertDatabaseHas('cities', ['id' => $legacy->id]);
    expect(app(WilayahSyncService::class)->sync())->toBe(['provinces' => 1, 'cities' => 2]);
    expect(Province::count())->toBe(1);
    expect(City::count())->toBe(3);
});

test('sync updates renamed regions by public code without changing their identity', function () {
    $province = Province::create(['name' => 'Nama lama', 'wilayah_code' => '13']);
    fakeWilayah();
    app(WilayahSyncService::class)->sync();
    expect($province->fresh()->name)->toBe('Sumatera Barat');
    expect(Province::count())->toBe(1);
});

test('failed public api responses leave all local data unchanged', function () {
    $province = Province::create(['name' => 'Data lama']);
    Http::fake([
        'wilayah.id/api/provinces.json' => Http::response(['data' => [['code' => '13', 'name' => 'Sumatera Barat']]]),
        'wilayah.id/api/regencies/13.json' => Http::response([], 503),
    ]);
    $this->actingAs(wilayahAdmin())->from(route('admin.master-data-section', ['section' => 'kota']))
        ->post(route('admin.master-data.wilayah.sync'))->assertSessionHasErrors('wilayah');
    expect(Province::count())->toBe(1);
    expect($province->fresh()->wilayah_code)->toBeNull();
    expect(City::count())->toBe(0);
});

test('malformed or empty public region data is rejected before saving', function (array $data) {
    Http::fake(['wilayah.id/api/provinces.json' => Http::response(['data' => $data])]);
    $this->actingAs(wilayahAdmin())->post(route('admin.master-data.wilayah.sync'))
        ->assertSessionHasErrors('wilayah');
    expect(Province::count())->toBe(0);
})->with([
    'empty' => [[]],
    'unsafe code' => [[['code' => '../13', 'name' => 'Invalid']]],
    'duplicate code' => [[['code' => '13', 'name' => 'One'], ['code' => '13', 'name' => 'Two']]],
]);

test('sync requires master permission and makes no outbound request when denied', function () {
    Http::fake();
    $this->actingAs(wilayahAdmin(false))->post(route('admin.master-data.wilayah.sync'))->assertForbidden();
    Http::assertNothingSent();
});
