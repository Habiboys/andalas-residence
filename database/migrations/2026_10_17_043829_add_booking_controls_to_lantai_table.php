<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('lantai', function (Blueprint $table) {
            $table->boolean('booking_open')->default(true);
            $table->unsignedInteger('booking_priority')->default(1);
            $table->index(['gedung_id', 'booking_open', 'booking_priority']);
        });
        $permission = Permission::firstOrCreate(['name' => 'room-availability.manage', 'guard_name' => 'web']);
        Role::whereIn('name', ['superadmin', 'staff_admin', 'admin_aset', 'fasilitator'])->where('guard_name', 'web')->get()->each(fn (Role $role) => $role->givePermissionTo($permission));
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lantai', function (Blueprint $table) {
            $table->dropIndex(['gedung_id', 'booking_open', 'booking_priority']);
            $table->dropColumn(['booking_open', 'booking_priority']);
        });
    }
};
