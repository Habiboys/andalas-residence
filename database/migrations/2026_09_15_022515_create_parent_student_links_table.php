<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parent_student_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('parent_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('student_profile_id')->constrained('mahasiswa_profil')->cascadeOnDelete();
            $table->string('relationship', 20);
            $table->boolean('is_primary_contact')->default(false);
            $table->timestamps();

            $table->unique(['parent_user_id', 'student_profile_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parent_student_links');
    }
};
