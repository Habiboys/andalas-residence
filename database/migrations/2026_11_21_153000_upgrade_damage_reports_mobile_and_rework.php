<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('damage_report_items', 'is_new')) {
            Schema::table('damage_report_items', function (Blueprint $table): void {
                $table->boolean('is_new')->default(false)->after('legacy');
            });
        }

        if (! Schema::hasColumn('damage_report_complaints', 'rating')) {
            Schema::table('damage_report_complaints', function (Blueprint $table): void {
                $table->unsignedTinyInteger('rating')->nullable()->after('reason');
                $table->foreignUuid('rework_report_id')->nullable()->after('rating')->constrained('laporan_kerusakan')->nullOnDelete();
            });
        }

        if (! app()->runningUnitTests()) {
            $permission = Permission::findOrCreate('tiket.rate', 'web');
            $studentRole = Role::where('name', 'mahasiswa')->where('guard_name', 'web')->first();
            if ($studentRole && ! $studentRole->hasPermissionTo($permission)) {
                $studentRole->givePermissionTo($permission);
            }
        }
    }

    public function down(): void
    {
        Schema::table('damage_report_complaints', function (Blueprint $table): void {
            if (Schema::hasColumn('damage_report_complaints', 'rework_report_id')) {
                $table->dropForeign(['rework_report_id']);
                $table->dropColumn('rework_report_id');
            }
            if (Schema::hasColumn('damage_report_complaints', 'rating')) {
                $table->dropColumn('rating');
            }
        });

        Schema::table('damage_report_items', function (Blueprint $table): void {
            if (Schema::hasColumn('damage_report_items', 'is_new')) {
                $table->dropColumn('is_new');
            }
        });
    }
};
