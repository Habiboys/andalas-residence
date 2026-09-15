<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kategori_aset', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('kode', 50)->unique();
            $table->string('nama', 150);
            $table->timestamps();
        });

        Schema::table('aset', function (Blueprint $table) {
            $table->foreignUuid('kategori_aset_id')->nullable()->after('nama_aset')->constrained('kategori_aset')->nullOnDelete();
            $table->string('status_siklus_hidup', 30)->default('aktif')->after('kondisi');
            $table->date('garansi_sampai')->nullable()->after('tanggal_pengadaan');
            $table->timestamp('dihapuskan_pada')->nullable()->after('garansi_sampai');
            $table->index(['status_siklus_hidup', 'kondisi']);
        });

        Schema::create('lokasi_aset', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('aset_id')->constrained('aset')->cascadeOnDelete();
            $table->foreignUuid('kamar_id')->nullable()->constrained('kamar')->nullOnDelete();
            $table->foreignUuid('fasilitas_umum_id')->nullable()->constrained('fasilitas_umum')->nullOnDelete();
            $table->string('nama_lokasi')->nullable();
            $table->timestamp('mulai_pada');
            $table->timestamp('selesai_pada')->nullable();
            $table->timestamps();
            $table->index(['aset_id', 'selesai_pada']);
        });

        Schema::create('pergerakan_aset', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('aset_id')->constrained('aset')->cascadeOnDelete();
            $table->foreignUuid('lokasi_asal_id')->nullable()->constrained('lokasi_aset')->nullOnDelete();
            $table->foreignUuid('lokasi_tujuan_id')->nullable()->constrained('lokasi_aset')->nullOnDelete();
            $table->foreignUuid('dipindahkan_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('dipindahkan_pada');
            $table->text('catatan')->nullable();
            $table->timestamps();
        });

        Schema::create('penanggung_jawab_aset', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('aset_id')->constrained('aset')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('mulai_pada');
            $table->timestamp('selesai_pada')->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();
            $table->index(['aset_id', 'selesai_pada']);
        });

        Schema::create('inspeksi_aset', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('aset_id')->constrained('aset')->cascadeOnDelete();
            $table->foreignUuid('diperiksa_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->string('kondisi', 30);
            $table->timestamp('diperiksa_pada');
            $table->text('temuan')->nullable();
            $table->timestamps();
        });

        Schema::create('pemeliharaan_aset', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('aset_id')->constrained('aset')->cascadeOnDelete();
            $table->string('status', 30)->default('dijadwalkan');
            $table->string('jenis', 50);
            $table->timestamp('dijadwalkan_pada')->nullable();
            $table->timestamp('dimulai_pada')->nullable();
            $table->timestamp('selesai_pada')->nullable();
            $table->decimal('biaya', 15, 2)->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();
        });

        Schema::create('penghapusan_aset', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('aset_id')->unique()->constrained('aset')->restrictOnDelete();
            $table->foreignUuid('disetujui_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->string('metode', 30);
            $table->text('alasan');
            $table->decimal('nilai_realisasi', 15, 2)->nullable();
            $table->timestamp('dihapuskan_pada');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penghapusan_aset');
        Schema::dropIfExists('pemeliharaan_aset');
        Schema::dropIfExists('inspeksi_aset');
        Schema::dropIfExists('penanggung_jawab_aset');
        Schema::dropIfExists('pergerakan_aset');
        Schema::dropIfExists('lokasi_aset');
        Schema::table('aset', function (Blueprint $table) {
            $table->dropIndex(['status_siklus_hidup', 'kondisi']);
            $table->dropConstrainedForeignId('kategori_aset_id');
            $table->dropColumn(['status_siklus_hidup', 'garansi_sampai', 'dihapuskan_pada']);
        });
        Schema::dropIfExists('kategori_aset');
    }
};
