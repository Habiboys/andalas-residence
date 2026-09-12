<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengajuan_bebas_asrama', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nomor_pengajuan', 50)->unique();
            $table->string('nomor_surat_resmi', 100)->nullable()->unique();
            $table->foreignUuid('mahasiswa_id')->constrained('mahasiswa_profil')->cascadeOnDelete();
            $table->text('alasan');
            $table->enum('status', ['diajukan', 'verifikasi_aset_dan_keuangan', 'disetujui', 'ditolak'])->default('diajukan');
            $table->text('catatan_penolakan')->nullable();
            $table->foreignUuid('disetujui_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->string('file_surat_path')->nullable();
            $table->timestamps();
        });

        Schema::create('pengajuan_izin_pulang', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('mahasiswa_id')->constrained('mahasiswa_profil')->cascadeOnDelete();
            $table->date('tanggal_mulai');
            $table->date('tanggal_kembali');
            $table->text('alasan');
            $table->string('tujuan_alamat')->nullable();
            $table->string('kontak_darurat', 50)->nullable();
            $table->enum('status', ['diajukan', 'disetujui', 'ditolak', 'selesai_kembali'])->default('diajukan');
            $table->foreignUuid('disetujui_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('absensi_sholat', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('mahasiswa_id')->constrained('mahasiswa_profil')->cascadeOnDelete();
            $table->enum('waktu_sholat', ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya']);
            $table->date('tanggal');
            $table->timestamp('waktu_scan');
            $table->foreignUuid('discan_oleh')->constrained('users')->restrictOnDelete();
            $table->enum('metode', ['barcode_scan', 'manual_input'])->default('barcode_scan');
            $table->timestamps();
            $table->unique(['mahasiswa_id', 'waktu_sholat', 'tanggal']);
        });

        Schema::create('kegiatan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('judul');
            $table->text('deskripsi')->nullable();
            $table->string('lokasi')->nullable();
            $table->timestamp('tanggal_mulai');
            $table->timestamp('tanggal_selesai');
            $table->json('target_role')->nullable();
            $table->foreignUuid('dibuat_oleh')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('kegiatan_partisipan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('kegiatan_id')->constrained('kegiatan')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status_konfirmasi', ['hadir', 'tidak_hadir', 'pending'])->default('pending');
            $table->timestamps();
            $table->unique(['kegiatan_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kegiatan_partisipan');
        Schema::dropIfExists('kegiatan');
        Schema::dropIfExists('absensi_sholat');
        Schema::dropIfExists('pengajuan_izin_pulang');
        Schema::dropIfExists('pengajuan_bebas_asrama');
    }
};
