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
        if (Schema::hasColumn('tagihan', 'cicilan_diminta_at')) {
            Schema::table('tagihan', function (Blueprint $table): void {
                $table->dropColumn(['cicilan_diminta_at', 'alasan_cicilan']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tagihan', function (Blueprint $table): void {
            $table->timestamp('cicilan_diminta_at')->nullable();
            $table->text('alasan_cicilan')->nullable();
        });
    }
};
