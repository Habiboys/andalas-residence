<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('provinces', function (Blueprint $table) {
            $table->string('wilayah_code', 2)->nullable()->unique();
        });
        Schema::table('cities', function (Blueprint $table) {
            $table->string('wilayah_code', 5)->nullable()->unique();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cities', function (Blueprint $table) {
            $table->dropUnique(['wilayah_code']);
            $table->dropColumn('wilayah_code');
        });
        Schema::table('provinces', function (Blueprint $table) {
            $table->dropUnique(['wilayah_code']);
            $table->dropColumn('wilayah_code');
        });
    }
};
