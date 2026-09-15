<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tagihan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nomor', 50)->unique();
            $table->foreignUuid('mahasiswa_id')->constrained('mahasiswa_profil')->restrictOnDelete();
            $table->string('status', 20)->default('draft');
            $table->char('mata_uang', 3)->default('IDR');
            $table->date('tanggal_terbit')->nullable();
            $table->date('jatuh_tempo')->nullable();
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('total_penyesuaian', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->decimal('total_dibayar', 15, 2)->default(0);
            $table->timestamps();
            $table->index(['mahasiswa_id', 'status']);
        });

        Schema::create('tagihan_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tagihan_id')->constrained('tagihan')->cascadeOnDelete();
            $table->string('deskripsi');
            $table->unsignedInteger('kuantitas')->default(1);
            $table->decimal('harga_satuan', 15, 2);
            $table->decimal('jumlah', 15, 2);
            $table->timestamps();
        });

        Schema::create('tagihan_penyesuaian', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tagihan_id')->constrained('tagihan')->cascadeOnDelete();
            $table->string('sumber', 40);
            $table->string('deskripsi');
            $table->decimal('jumlah', 15, 2);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('jadwal_cicilan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tagihan_id')->constrained('tagihan')->cascadeOnDelete();
            $table->unsignedInteger('termin_ke');
            $table->date('jatuh_tempo');
            $table->decimal('jumlah', 15, 2);
            $table->string('status', 20)->default('belum_bayar');
            $table->timestamps();
            $table->unique(['tagihan_id', 'termin_ke']);
        });

        Schema::create('virtual_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('mahasiswa_id')->constrained('mahasiswa_profil')->restrictOnDelete();
            $table->string('bank', 50);
            $table->string('nomor', 100)->unique();
            $table->string('atas_nama');
            $table->boolean('aktif')->default(true);
            $table->date('berlaku_sampai')->nullable();
            $table->timestamps();
        });

        Schema::create('pembayaran_tagihan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('referensi', 100)->unique();
            $table->foreignUuid('mahasiswa_id')->constrained('mahasiswa_profil')->restrictOnDelete();
            $table->foreignUuid('virtual_account_id')->nullable()->constrained('virtual_accounts')->nullOnDelete();
            $table->decimal('jumlah', 15, 2);
            $table->timestamp('dibayar_pada');
            $table->string('status', 20)->default('posted');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('alokasi_pembayaran', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('pembayaran_tagihan_id')->constrained('pembayaran_tagihan')->restrictOnDelete();
            $table->foreignUuid('tagihan_id')->constrained('tagihan')->restrictOnDelete();
            $table->foreignUuid('jadwal_cicilan_id')->nullable()->constrained('jadwal_cicilan')->restrictOnDelete();
            $table->decimal('jumlah', 15, 2);
            $table->timestamps();
            $table->unique(['pembayaran_tagihan_id', 'tagihan_id', 'jadwal_cicilan_id'], 'alokasi_pembayaran_unik');
        });

        Schema::create('dokumen_tagihan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tagihan_id')->constrained('tagihan')->restrictOnDelete();
            $table->foreignUuid('pembayaran_tagihan_id')->nullable()->constrained('pembayaran_tagihan')->restrictOnDelete();
            $table->string('jenis', 30);
            $table->string('nomor', 100)->unique();
            $table->string('path');
            $table->char('checksum_sha256', 64);
            $table->timestamp('diterbitkan_pada');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dokumen_tagihan');
        Schema::dropIfExists('alokasi_pembayaran');
        Schema::dropIfExists('pembayaran_tagihan');
        Schema::dropIfExists('virtual_accounts');
        Schema::dropIfExists('jadwal_cicilan');
        Schema::dropIfExists('tagihan_penyesuaian');
        Schema::dropIfExists('tagihan_items');
        Schema::dropIfExists('tagihan');
    }
};
