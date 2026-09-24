<?php

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Schema;

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
});

it('does not expose server maintenance commands as a residence business feature', function (): void {
    $superadmin = User::factory()->create();
    $superadmin->assignRole('superadmin');

    $this->actingAs($superadmin)->get('/admin/artisan-runner')->assertNotFound();
    $this->postJson('/andalas/artisan-runner/run', [
        'command' => 'view:clear',
        'confirm' => true,
    ])->assertNotFound();

    expect(Schema::hasTable('artisan_command_logs'))->toBeFalse();
});
