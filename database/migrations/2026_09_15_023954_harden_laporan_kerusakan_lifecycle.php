<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laporan_kerusakan_photos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('laporan_kerusakan_id')->constrained('laporan_kerusakan')->cascadeOnDelete();
            $table->string('type', 20);
            $table->string('path');
            $table->foreignUuid('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->index(['laporan_kerusakan_id', 'type']);
        });

        Schema::create('laporan_kerusakan_status_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('laporan_kerusakan_id')->constrained('laporan_kerusakan')->cascadeOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->foreignUuid('changed_by')->constrained('users')->restrictOnDelete();
            $table->text('description')->nullable();
            $table->timestamps();
            $table->index(['laporan_kerusakan_id', 'created_at']);
        });

        Schema::create('laporan_kerusakan_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('laporan_kerusakan_id')->constrained('laporan_kerusakan')->cascadeOnDelete();
            $table->foreignUuid('technician_id')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('assigned_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('assigned_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
            $table->index(['laporan_kerusakan_id', 'ended_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laporan_kerusakan_assignments');
        Schema::dropIfExists('laporan_kerusakan_status_histories');
        Schema::dropIfExists('laporan_kerusakan_photos');
    }
};
