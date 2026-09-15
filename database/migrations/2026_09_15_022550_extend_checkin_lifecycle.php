<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('checkin', function (Blueprint $table) {
            $table->foreignUuid('penempatan_kamar_id')->nullable()->after('periode_id')->constrained('penempatan_kamar')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('checkin', function (Blueprint $table) {
            $table->dropConstrainedForeignId('penempatan_kamar_id');
        });
    }
};
