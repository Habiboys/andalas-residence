<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_preferences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('residence_registration_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('kamar_id')->nullable()->constrained('kamar')->nullOnDelete();
            $table->unsignedTinyInteger('priority');
            $table->string('room_type', 50)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['residence_registration_id', 'priority']);
            $table->unique(['residence_registration_id', 'kamar_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_preferences');
    }
};
