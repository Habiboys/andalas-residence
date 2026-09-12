<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('faculty', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('departemen', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('faculty_id')->constrained('faculty')->restrictOnDelete();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('prodi', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('departemen_id')->constrained('departemen')->restrictOnDelete();
            $table->string('name');
            $table->string('jenjang', 50)->nullable();
            $table->timestamps();
        });

        Schema::create('countries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('provinces', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('cities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('province_id')->nullable()->constrained('provinces')->nullOnDelete();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('periode', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama_periode', 100);
            $table->enum('status', ['aktif', 'nonaktif'])->default('nonaktif');
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai');
            $table->timestamps();
        });

        Schema::create('mahasiswa_profil', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('prodi_id')->nullable()->constrained('prodi')->nullOnDelete();
            $table->foreignUuid('periode_id')->nullable()->constrained('periode')->nullOnDelete();
            $table->foreignUuid('city_id')->nullable()->constrained('cities')->nullOnDelete();
            $table->string('angkatan', 4)->nullable();
            $table->string('barcode_code', 64)->unique();
            $table->string('nik', 16)->nullable()->unique();
            $table->string('bpjs_path')->nullable();
            $table->string('riwayat_penyakit_path')->nullable();
            $table->string('bukti_lulus_path')->nullable();
            $table->enum('status_huni', ['calon', 'aktif', 'izin_pulang', 'bebas_asrama', 'keluar'])->default('calon');
            $table->date('tanggal_masuk')->nullable();
            $table->timestamps();
        });

        Schema::create('fasilitator_wilayah', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('gedung_id')->nullable();
            $table->foreignUuid('lantai_id')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fasilitator_wilayah');
        Schema::dropIfExists('mahasiswa_profil');
        Schema::dropIfExists('periode');
        Schema::dropIfExists('cities');
        Schema::dropIfExists('provinces');
        Schema::dropIfExists('countries');
        Schema::dropIfExists('prodi');
        Schema::dropIfExists('departemen');
        Schema::dropIfExists('faculty');
    }
};
