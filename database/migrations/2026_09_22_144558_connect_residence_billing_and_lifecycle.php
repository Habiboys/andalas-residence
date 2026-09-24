<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table): void {
            $table->decimal('facilitator_latitude', 10, 7)->nullable();
            $table->decimal('facilitator_longitude', 10, 7)->nullable();
            $table->decimal('facilitator_accuracy_meters', 10, 2)->nullable();
            $table->timestamp('facilitator_located_at')->nullable();
        });
        Schema::create('legacy_residence_rates', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedSmallInteger('angkatan')->unique();
            $table->decimal('jumlah', 15, 2);
            $table->timestamps();
        });
        Schema::table('residence_registrations', function (Blueprint $table): void {
            $table->foreignUuid('tagihan_id')->nullable()->unique()->constrained('tagihan')->restrictOnDelete();
            $table->timestamp('completed_at')->nullable();
        });
        Schema::table('pembayaran', function (Blueprint $table): void {
            $table->foreignUuid('tagihan_id')->nullable()->constrained('tagihan')->restrictOnDelete();
        });
        Schema::table('pengajuan_bebas_asrama', function (Blueprint $table): void {
            $table->foreignUuid('tagihan_id')->nullable()->constrained('tagihan')->restrictOnDelete();
            $table->string('bank_statement_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table): void {
            $table->dropColumn(['facilitator_latitude', 'facilitator_longitude', 'facilitator_accuracy_meters', 'facilitator_located_at']);
        });
        Schema::dropIfExists('legacy_residence_rates');
        Schema::table('pengajuan_bebas_asrama', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('tagihan_id');
            $table->dropColumn('bank_statement_path');
        });
        Schema::table('pembayaran', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('tagihan_id');
        });
        Schema::table('residence_registrations', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('tagihan_id');
            $table->dropColumn('completed_at');
        });
    }
};
