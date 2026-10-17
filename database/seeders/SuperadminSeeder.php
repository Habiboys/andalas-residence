<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class SuperadminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);
        $user = User::firstOrCreate(['email' => 'superadmin@example.test'], [
            'nim_nip' => 'SA-LEGACY', 'nama' => 'Super Admin', 'password' => 'password',
            'status' => 'aktif', 'email_verified_at' => now(),
        ]);
        if ($user->wasRecentlyCreated) {
            $user->assignRole('superadmin');
        }
    }
}
