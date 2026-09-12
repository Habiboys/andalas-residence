<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('informasis', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('kategori', ['regulasi', 'sop', 'panduan', 'pengumuman']);
            $table->string('judul', 200);
            $table->longText('konten')->nullable();
            $table->date('tanggal')->nullable();
            $table->string('file')->nullable();
            $table->boolean('published')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('informasis');
    }
};
