<?php

use App\Enums\ResidenceRegistrationStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('residence_registrations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('student_profile_id')->constrained('mahasiswa_profil')->cascadeOnDelete();
            $table->foreignUuid('periode_id')->constrained('periode')->restrictOnDelete();
            $table->string('status', 20)->default(ResidenceRegistrationStatus::Draft->value);
            $table->timestamp('submitted_at')->nullable();
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['student_profile_id', 'periode_id']);
            $table->index(['periode_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('residence_registrations');
    }
};
