<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pesanan_laundry', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nomor', 50)->unique();
            $table->foreignUuid('penempatan_kamar_id')->constrained('penempatan_kamar')->restrictOnDelete();
            $table->foreignUuid('tagihan_item_id')->nullable()->unique()->constrained('tagihan_items')->nullOnDelete();
            $table->string('status', 30)->default('diajukan');
            $table->decimal('berat_kg', 8, 2)->nullable();
            $table->decimal('harga', 15, 2)->nullable();
            $table->timestamp('diambil_pada')->nullable();
            $table->timestamp('selesai_pada')->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();
            $table->index(['penempatan_kamar_id', 'status']);
        });

        Schema::create('pesanan_galon', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nomor', 50)->unique();
            $table->foreignUuid('penempatan_kamar_id')->constrained('penempatan_kamar')->restrictOnDelete();
            $table->foreignUuid('tagihan_item_id')->nullable()->unique()->constrained('tagihan_items')->nullOnDelete();
            $table->string('status', 30)->default('diajukan');
            $table->unsignedSmallInteger('jumlah')->default(1);
            $table->decimal('harga', 15, 2)->nullable();
            $table->timestamp('diantar_pada')->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();
            $table->index(['penempatan_kamar_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pesanan_galon');
        Schema::dropIfExists('pesanan_laundry');
    }
};
