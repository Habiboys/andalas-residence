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
        Schema::table('gedung', function (Blueprint $table): void {
            $table->json('room_types')->nullable();
        });
        Schema::table('residence_registrations', function (Blueprint $table): void {
            $table->string('billing_basis')->default('person');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gedung', function (Blueprint $table): void {
            $table->dropColumn('room_types');
        });
        Schema::table('residence_registrations', function (Blueprint $table): void {
            $table->dropColumn('billing_basis');
        });
    }
};
