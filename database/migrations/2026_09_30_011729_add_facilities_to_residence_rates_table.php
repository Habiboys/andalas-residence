<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('residence_rates', function (Blueprint $table): void {
            $table->text('facilities')->nullable();
        });
        DB::table('residence_rates')->where('unit', 'period')->update(['unit' => 'year']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('residence_rates')->where('unit', 'year')->update(['unit' => 'period']);
        Schema::table('residence_rates', function (Blueprint $table): void {
            $table->dropColumn('facilities');
        });
    }
};
