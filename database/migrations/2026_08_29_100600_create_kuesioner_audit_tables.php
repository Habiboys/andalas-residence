<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kuesioner', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('kode', 50)->unique();
            $table->string('nama', 150);
            $table->text('deskripsi')->nullable();
            $table->enum('jenis', ['penilaian_teknisi'])->default('penilaian_teknisi');
            $table->unsignedInteger('versi')->default(1);
            $table->enum('status', ['draft', 'aktif', 'arsip'])->default('draft');
            $table->date('berlaku_mulai')->nullable();
            $table->date('berlaku_sampai')->nullable();
            $table->foreignUuid('dibuat_oleh')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('kuesioner_pertanyaan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('kuesioner_id')->constrained('kuesioner')->cascadeOnDelete();
            $table->string('kode_pertanyaan', 50);
            $table->text('teks_pertanyaan');
            $table->enum('tipe_jawaban', ['skala', 'ya_tidak', 'teks'])->default('skala');
            $table->decimal('bobot', 8, 4)->default(1);
            $table->decimal('skor_minimal', 8, 4)->default(1);
            $table->decimal('skor_maksimal', 8, 4)->default(5);
            $table->boolean('wajib')->default(true);
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
            $table->unique(['kuesioner_id', 'kode_pertanyaan']);
        });

        Schema::create('kuesioner_opsi', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('pertanyaan_id')->constrained('kuesioner_pertanyaan')->cascadeOnDelete();
            $table->string('label', 150);
            $table->decimal('nilai_skor', 8, 4);
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });

        Schema::create('penilaian_teknisi', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('laporan_kerusakan_id')->unique()->constrained('laporan_kerusakan')->restrictOnDelete();
            $table->foreignUuid('kuesioner_id')->constrained('kuesioner')->restrictOnDelete();
            $table->foreignUuid('teknisi_id')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('dinilai_oleh')->constrained('users')->restrictOnDelete();
            $table->enum('status', ['draft', 'final'])->default('draft');
            $table->decimal('total_skor', 10, 4)->nullable();
            $table->decimal('skor_persentase', 5, 2)->nullable();
            $table->text('catatan_umum')->nullable();
            $table->timestamp('tanggal_penilaian')->nullable();
            $table->timestamps();
        });

        Schema::create('jawaban_penilaian_teknisi', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('penilaian_teknisi_id')->constrained('penilaian_teknisi')->cascadeOnDelete();
            $table->foreignUuid('pertanyaan_id')->nullable()->constrained('kuesioner_pertanyaan')->nullOnDelete();
            $table->string('kode_pertanyaan_snapshot', 50);
            $table->text('teks_pertanyaan_snapshot');
            $table->decimal('bobot_snapshot', 8, 4);
            $table->decimal('nilai_skor', 8, 4)->nullable();
            $table->text('jawaban_teks')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event', 50);
            $table->string('auditable_type', 100);
            $table->string('auditable_id', 64);
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
            $table->index(['auditable_type', 'auditable_id']);
            $table->index(['event', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('jawaban_penilaian_teknisi');
        Schema::dropIfExists('penilaian_teknisi');
        Schema::dropIfExists('kuesioner_opsi');
        Schema::dropIfExists('kuesioner_pertanyaan');
        Schema::dropIfExists('kuesioner');
    }
};
