<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kategori_transaksi', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama_kategori', 100);
            $table->enum('tipe', ['pemasukan', 'pengeluaran']);
            $table->string('kode_rekening', 50)->nullable();
            $table->timestamps();
        });

        Schema::create('transaksi_keuangan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nomor_bukti', 50)->unique();
            $table->foreignUuid('kategori_id')->constrained('kategori_transaksi')->restrictOnDelete();
            $table->foreignUuid('pembayaran_mahasiswa_id')->nullable()->constrained('pembayaran')->nullOnDelete();
            $table->enum('tipe', ['pemasukan', 'pengeluaran']);
            $table->decimal('nominal', 15, 2);
            $table->text('deskripsi')->nullable();
            $table->date('tanggal_transaksi');
            $table->string('nomor_spm_sp2d', 100)->nullable();
            $table->json('rincian_pajak')->nullable();
            $table->string('lampiran_path')->nullable();
            $table->foreignUuid('dicatat_oleh')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaksi_keuangan');
        Schema::dropIfExists('kategori_transaksi');
    }
};
