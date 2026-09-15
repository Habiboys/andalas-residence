<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checkout_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('mahasiswa_id')->constrained('mahasiswa_profil')->restrictOnDelete();
            $table->foreignUuid('penempatan_kamar_id')->constrained('penempatan_kamar')->restrictOnDelete();
            $table->string('status', 30)->default('diajukan');
            $table->text('alasan')->nullable();
            $table->timestamp('diajukan_at');
            $table->timestamp('disetujui_at')->nullable();
            $table->timestamp('selesai_at')->nullable();
            $table->foreignUuid('diproses_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['mahasiswa_id', 'status']);
        });

        Schema::create('room_inspections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('checkout_request_id')->unique()->constrained('checkout_requests')->cascadeOnDelete();
            $table->foreignUuid('inspector_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 30)->default('menunggu');
            $table->text('catatan')->nullable();
            $table->timestamp('inspected_at')->nullable();
            $table->timestamps();
        });

        Schema::create('room_inspection_checklist_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('room_inspection_id')->constrained('room_inspections')->cascadeOnDelete();
            $table->string('item', 150);
            $table->string('condition', 30)->default('baik');
            $table->text('catatan')->nullable();
            $table->timestamps();
            $table->unique(['room_inspection_id', 'item']);
        });

        Schema::create('room_inspection_findings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('room_inspection_id')->constrained('room_inspections')->cascadeOnDelete();
            $table->foreignUuid('aset_id')->nullable()->constrained('aset')->nullOnDelete();
            $table->foreignUuid('laporan_kerusakan_id')->nullable()->unique()->constrained('laporan_kerusakan')->nullOnDelete();
            $table->text('description');
            $table->string('severity', 30)->default('ringan');
            $table->decimal('estimated_cost', 12, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('asset_clearances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('checkout_request_id')->unique()->constrained('checkout_requests')->cascadeOnDelete();
            $table->string('status', 30)->default('menunggu');
            $table->text('catatan')->nullable();
            $table->foreignUuid('cleared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cleared_at')->nullable();
            $table->timestamps();
        });

        Schema::create('finance_clearances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('checkout_request_id')->unique()->constrained('checkout_requests')->cascadeOnDelete();
            $table->string('status', 30)->default('menunggu');
            $table->decimal('outstanding_amount', 12, 2)->default(0);
            $table->text('catatan')->nullable();
            $table->foreignUuid('cleared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cleared_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_clearances');
        Schema::dropIfExists('asset_clearances');
        Schema::dropIfExists('room_inspection_findings');
        Schema::dropIfExists('room_inspection_checklist_items');
        Schema::dropIfExists('room_inspections');
        Schema::dropIfExists('checkout_requests');
    }
};
