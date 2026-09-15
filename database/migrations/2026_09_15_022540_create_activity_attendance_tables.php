<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('residence_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('mahasiswa_id')->constrained('mahasiswa_profil')->cascadeOnDelete();
            $table->string('event', 20);
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->index(['mahasiswa_id', 'occurred_at']);
        });

        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('kegiatan_id')->constrained('kegiatan')->cascadeOnDelete();
            $table->foreignUuid('facilitator_id')->constrained('users')->restrictOnDelete();
            $table->char('qr_token_hash', 64)->unique();
            $table->timestamp('opens_at');
            $table->timestamp('expires_at');
            $table->timestamp('closed_at')->nullable();
            $table->decimal('anchor_latitude', 10, 7);
            $table->decimal('anchor_longitude', 10, 7);
            $table->unsignedInteger('radius_meters');
            $table->unsignedInteger('maximum_accuracy_meters');
            $table->timestamps();
        });

        Schema::create('attendance_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('attendance_session_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('mahasiswa_id')->constrained('mahasiswa_profil')->cascadeOnDelete();
            $table->timestamp('attempted_at');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->decimal('accuracy_meters', 8, 2)->nullable();
            $table->decimal('distance_meters', 10, 2)->nullable();
            $table->string('rejection_reason', 32)->nullable();
            $table->timestamps();
            $table->index(['attendance_session_id', 'mahasiswa_id']);
        });

        Schema::create('activity_attendances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('attendance_session_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('mahasiswa_id')->constrained('mahasiswa_profil')->cascadeOnDelete();
            $table->foreignUuid('attendance_attempt_id')->unique()->constrained()->restrictOnDelete();
            $table->timestamp('attended_at');
            $table->timestamps();
            $table->unique(['attendance_session_id', 'mahasiswa_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_attendances');
        Schema::dropIfExists('attendance_attempts');
        Schema::dropIfExists('attendance_sessions');
        Schema::dropIfExists('residence_histories');
    }
};
