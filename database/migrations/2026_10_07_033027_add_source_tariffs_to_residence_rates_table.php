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
        Schema::table('residence_rates', function (Blueprint $table): void {
            $table->decimal('student_amount', 15, 2)->nullable();
            $table->decimal('room_amount', 15, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('residence_rates', function (Blueprint $table): void {
            $table->dropColumn(['student_amount', 'room_amount']);
        });
    }
};
