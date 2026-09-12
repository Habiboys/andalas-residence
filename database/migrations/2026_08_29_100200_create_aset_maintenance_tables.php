<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aset', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('kamar_id')->nullable()->constrained('kamar')->nullOnDelete();
            $table->foreignUuid('fasilitas_umum_id')->nullable()->constrained('fasilitas_umum')->nullOnDelete();
            $table->string('kode_inventaris', 50)->unique();
            $table->string('kode_gudang', 50)->nullable();
            $table->string('nama_aset', 150);
            $table->string('kategori', 50)->nullable();
            $table->enum('kondisi', ['baik', 'rusak_ringan', 'rusak_berat', 'hilang'])->default('baik');
            $table->decimal('nilai_aset', 15, 2)->nullable();
            $table->date('tanggal_pengadaan')->nullable();
            $table->timestamps();
        });

        Schema::create('laporan_kerusakan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nomor_tiket', 50)->unique();
            $table->foreignUuid('aset_id')->nullable()->constrained('aset')->nullOnDelete();
            $table->foreignUuid('kamar_id')->nullable()->constrained('kamar')->nullOnDelete();
            $table->foreignUuid('dilaporkan_oleh')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('teknisi_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('deskripsi');
            $table->string('foto_sebelum')->nullable();
            $table->string('foto_sesudah')->nullable();
            $table->enum('metode_penanganan', ['perbaikan', 'penggantian'])->nullable();
            $table->decimal('biaya_riil', 12, 2)->nullable();
            $table->enum('status', ['menunggu_triage', 'didisposisikan', 'sedang_dikerjakan', 'selesai', 'dibatalkan'])->default('menunggu_triage');
            $table->timestamp('tanggal_lapor');
            $table->timestamp('tanggal_selesai')->nullable();
            $table->text('catatan_penyelesaian')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laporan_kerusakan');
        Schema::dropIfExists('aset');
    }
};
