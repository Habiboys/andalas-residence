<?php

use App\Models\MahasiswaProfil;
use App\Models\ParentStudentLink;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('operational roles receive separate permissions', function () {
    $serviceAdmin = User::factory()->create()->assignRole('admin_layanan');
    $assetAdmin = User::factory()->create()->assignRole('admin_aset');
    $roomInspector = User::factory()->create()->assignRole('go');

    expect($serviceAdmin->can('billing.manage'))->toBeTrue()
        ->and($serviceAdmin->can('aset.delete'))->toBeFalse()
        ->and($assetAdmin->can('aset.update'))->toBeTrue()
        ->and($assetAdmin->can('billing.manage'))->toBeFalse()
        ->and($roomInspector->can('inspection.manage'))->toBeTrue();
});

test('parent can only view their linked student and cannot mutate links', function () {
    $parent = User::factory()->create()->assignRole('orang_tua');
    $otherParent = User::factory()->create()->assignRole('orang_tua');
    $student = User::factory()->student()->create();
    $profile = MahasiswaProfil::query()->create([
        'user_id' => $student->id,
        'barcode_code' => fake()->unique()->uuid(),
    ]);
    $link = ParentStudentLink::factory()->create([
        'parent_user_id' => $parent->id,
        'student_profile_id' => $profile->id,
    ]);

    expect($parent->can('view', $link))->toBeTrue()
        ->and($otherParent->can('view', $link))->toBeFalse()
        ->and($parent->can('update', $link))->toBeFalse()
        ->and($parent->can('delete', $link))->toBeFalse();
});
