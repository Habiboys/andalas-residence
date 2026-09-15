<?php

use App\Models\User;
use Spatie\Permission\Models\Role;

function actor(string $role): User
{
    $user = User::factory()->create();
    $user->assignRole(Role::findOrCreate($role));

    return $user;
}

test('role page namespaces fail closed for other actors', function (string $role, string $path) {
    $this->actingAs(actor($role))->get($path)->assertForbidden();
})->with([
    'mahasiswa to admin' => ['mahasiswa', '/admin/dashboard'],
    'teknisi to facilitator' => ['teknisi', '/fasilitator/dashboard'],
    'fasilitator to executive' => ['fasilitator', '/pimpinan/dashboard'],
    'pimpinan to student' => ['pimpinan', '/mahasiswa/dashboard'],
]);

test('superadmin-only pages reject legacy staff admin', function (string $path) {
    $this->actingAs(actor('staff_admin'))->get($path)->assertForbidden();
})->with(['/admin/akun-internal', '/admin/audit-log']);
