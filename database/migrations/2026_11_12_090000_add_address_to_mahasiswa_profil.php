<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mahasiswa_profil', function (Blueprint $table): void {
            $table->string('alamat', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('mahasiswa_profil', function (Blueprint $table): void {
            $table->dropColumn('alamat');
        });
    }
};
