<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('damage_report_items', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('laporan_kerusakan_id')->constrained('laporan_kerusakan')->restrictOnDelete();
            $table->foreignUuid('aset_id')->nullable()->constrained('aset')->restrictOnDelete();
            $table->foreignUuid('reported_by')->constrained('users')->restrictOnDelete();
            $table->text('description');
            $table->string('location_label')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignUuid('completed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->text('completion_note')->nullable();
            $table->boolean('legacy')->default(false);
            $table->timestamps();
        });
        Schema::table('laporan_kerusakan_photos', function (Blueprint $table): void {
            $table->foreignUuid('item_id')->nullable()->constrained('damage_report_items')->restrictOnDelete();
        });
        Schema::create('damage_report_submissions', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('user_id')->constrained('users')->restrictOnDelete();
            $table->uuid('request_key');
            $table->string('request_hash', 64);
            $table->foreignUuid('laporan_kerusakan_id')->constrained('laporan_kerusakan')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'request_key'], 'damage_submission_unique');
        });
        Schema::create('technician_logbooks', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->restrictOnDelete();
            $table->date('work_date')->index();
            $table->text('description');
            $table->string('source', 30)->default('other_work');
            $table->foreignUuid('gedung_id')->nullable()->constrained('gedung')->restrictOnDelete();
            $table->uuid('request_key');
            $table->string('request_hash', 64);
            $table->timestamps();
            $table->unique(['user_id', 'request_key'], 'technician_logbook_request_unique');
        });
        Schema::create('technician_logbook_photos', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('logbook_id')->constrained('technician_logbooks')->restrictOnDelete();
            $table->string('path');
            $table->timestamps();
        });
        Schema::create('damage_report_complaints', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('laporan_kerusakan_id')->constrained('laporan_kerusakan')->restrictOnDelete();
            $table->foreignUuid('item_id')->nullable()->constrained('damage_report_items')->restrictOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->restrictOnDelete();
            $table->text('reason');
            $table->string('status', 30)->default('submitted');
            $table->uuid('request_key');
            $table->timestamps();
            $table->unique(['user_id', 'request_key'], 'damage_complaint_request_unique');
        });
        DB::table('laporan_kerusakan')->orderBy('id')->chunkById(200, function ($reports): void {
            foreach ($reports as $report) {
                DB::table('damage_report_items')->insert([
                    'id' => (string) Str::uuid(), 'laporan_kerusakan_id' => $report->id,
                    'aset_id' => $report->aset_id, 'reported_by' => $report->dilaporkan_oleh,
                    'description' => $report->deskripsi, 'location_label' => $report->location_label,
                    'completed_at' => $report->status === 'selesai' ? $report->tanggal_selesai : null,
                    'completed_by' => $report->status === 'selesai' ? $report->teknisi_id : null,
                    'completion_note' => $report->catatan_penyelesaian, 'legacy' => true,
                    'created_at' => $report->created_at, 'updated_at' => $report->updated_at,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('damage_report_complaints');
        Schema::dropIfExists('technician_logbook_photos');
        Schema::dropIfExists('technician_logbooks');
        Schema::dropIfExists('damage_report_submissions');
        Schema::table('laporan_kerusakan_photos', function (Blueprint $table): void {
            $table->dropForeign(['item_id']);
            $table->dropColumn('item_id');
        });
        Schema::dropIfExists('damage_report_items');
    }
};
