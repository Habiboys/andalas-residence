<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('testimonis', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 150);
            $table->string('prodi', 150)->nullable();
            $table->text('teks');
            $table->string('foto')->nullable();
            $table->unsignedInteger('urutan')->default(0);
            $table->boolean('published')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('testimonis');
    }
};
