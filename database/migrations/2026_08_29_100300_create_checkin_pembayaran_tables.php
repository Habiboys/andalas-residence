<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checkin', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('mahasiswa_id')->constrained('mahasiswa_profil')->cascadeOnDelete();
            $table->foreignUuid('periode_id')->nullable()->constrained('periode')->nullOnDelete();
            $table->date('tanggal_rencana_masuk');
            $table->timestamp('tanggal_aktual_checkin')->nullable();
            $table->enum('status', ['menunggu_verifikasi_pembayaran', 'siap_checkin', 'selesai_checkin'])->default('menunggu_verifikasi_pembayaran');
            $table->foreignUuid('petugas_checkin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('pembayaran', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('kode_transaksi', 50)->unique();
            $table->foreignUuid('mahasiswa_id')->constrained('mahasiswa_profil')->cascadeOnDelete();
            $table->foreignUuid('checkin_id')->nullable()->constrained('checkin')->nullOnDelete();
            $table->enum('jenis_pembayaran', ['sewa_asrama', 'cicilan', 'denda_kerusakan', 'lainnya'])->default('sewa_asrama');
            $table->decimal('nominal', 12, 2);
            $table->integer('termin_ke')->default(1);
            $table->string('metode_pembayaran', 50)->default('transfer_bank');
            $table->string('nama_bank', 50)->nullable();
            $table->string('nomor_rekening_pengirim', 50)->nullable();
            $table->string('atas_nama_pengirim', 150)->nullable();
            $table->string('bukti_transfer_path')->nullable();
            $table->enum('status', ['menunggu_verifikasi', 'lunas', 'ditolak', 'kadaluarsa'])->default('menunggu_verifikasi');
            $table->foreignUuid('diverifikasi_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->text('catatan_verifikasi')->nullable();
            $table->timestamp('tanggal_bayar')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pembayaran');
        Schema::dropIfExists('checkin');
    }
};
