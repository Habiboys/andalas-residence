<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('program_subs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('program_id')->constrained('programs')->cascadeOnDelete();
            $table->string('judul', 200);
            $table->longText('deskripsi')->nullable();
            $table->string('gambar')->nullable();
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program_subs');
    }
};
