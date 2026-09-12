<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 150);
            $table->text('deskripsi')->nullable();
            $table->string('ikon')->nullable();
            $table->unsignedInteger('urutan')->default(0);
            $table->boolean('published')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('programs');
    }
};
