<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gedung', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('kode_gedung', 10)->unique();
            $table->string('nama_gedung', 100);
            $table->enum('gender_peruntukan', ['laki_laki', 'perempuan', 'campur'])->default('campur');
            $table->string('alamat')->nullable();
            $table->text('deskripsi')->nullable();
            $table->string('foto')->nullable();
            $table->timestamps();
        });

        Schema::table('fasilitator_wilayah', function (Blueprint $table) {
            $table->foreign('gedung_id')->references('id')->on('gedung')->cascadeOnDelete();
        });

        Schema::create('lantai', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('gedung_id')->constrained('gedung')->cascadeOnDelete();
            $table->integer('nomor_lantai');
            $table->string('nama_lantai', 50);
            $table->timestamps();
            $table->unique(['gedung_id', 'nomor_lantai']);
        });

        Schema::table('fasilitator_wilayah', function (Blueprint $table) {
            $table->foreign('lantai_id')->references('id')->on('lantai')->nullOnDelete();
        });

        Schema::create('kamar', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('lantai_id')->constrained('lantai')->cascadeOnDelete();
            $table->string('nomor_kamar', 20);
            $table->integer('kapasitas')->default(1);
            $table->enum('status', ['kosong', 'terisi_sebagian', 'penuh', 'maintenance'])->default('kosong');
            $table->string('tipe_kamar', 50)->default('reguler');
            $table->decimal('tarif_per_periode', 12, 2)->default(0);
            $table->timestamps();
            $table->unique(['lantai_id', 'nomor_kamar']);
        });

        Schema::create('penempatan_kamar', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('mahasiswa_id')->constrained('mahasiswa_profil')->cascadeOnDelete();
            $table->foreignUuid('kamar_id')->constrained('kamar')->restrictOnDelete();
            $table->foreignUuid('periode_id')->nullable()->constrained('periode')->nullOnDelete();
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai')->nullable();
            $table->enum('metode', ['auto_assign', 'manual_override'])->default('auto_assign');
            $table->enum('status', ['aktif', 'berakhir', 'pindah'])->default('aktif');
            $table->foreignUuid('diproses_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->text('catatan')->nullable();
            $table->timestamps();
        });

        Schema::create('fasilitas_umum', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('gedung_id')->constrained('gedung')->cascadeOnDelete();
            $table->foreignUuid('lantai_id')->nullable()->constrained('lantai')->nullOnDelete();
            $table->string('nama_fasilitas', 100);
            $table->string('kategori', 50)->nullable();
            $table->enum('kondisi', ['baik', 'rusak_ringan', 'rusak_berat'])->default('baik');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fasilitas_umum');
        Schema::dropIfExists('penempatan_kamar');
        Schema::dropIfExists('kamar');
        Schema::table('fasilitator_wilayah', function (Blueprint $table) {
            $table->dropForeign(['lantai_id']);
            $table->dropForeign(['gedung_id']);
        });
        Schema::dropIfExists('lantai');
        Schema::dropIfExists('gedung');
    }
};
