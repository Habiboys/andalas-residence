<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('laporan_kerusakan', function (Blueprint $table): void {
            $table->foreignUuid('gedung_id')->nullable()->constrained('gedung')->restrictOnDelete();
            $table->foreignUuid('fasilitas_umum_id')->nullable()->constrained('fasilitas_umum')->restrictOnDelete();
            $table->string('source', 30)->default('legacy_unknown');
            $table->string('location_label')->nullable();
            $table->string('priority', 20)->default('normal');
            $table->text('different_incident_reason')->nullable();
            $table->uuid('request_key')->nullable();
            $table->string('request_hash', 64)->nullable();
            $table->string('completion_hash', 64)->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->foreignUuid('cancelled_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->boolean('is_blocked')->default(false);
            $table->unique(['dilaporkan_oleh', 'request_key'], 'damage_report_request_unique');
            $table->index(['gedung_id', 'status', 'tanggal_lapor'], 'damage_report_building_status_idx');
        });
        Schema::table('laporan_kerusakan_assignments', function (Blueprint $table): void {
            $table->string('role', 20)->default('lead');
        });
        Schema::create('damage_report_progress', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('laporan_kerusakan_id')->constrained('laporan_kerusakan')->restrictOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->restrictOnDelete();
            $table->date('work_date');
            $table->text('description');
            $table->boolean('is_blocked')->default(false);
            $table->uuid('request_key');
            $table->string('request_hash', 64);
            $table->timestamps();
            $table->unique(['user_id', 'request_key'], 'damage_progress_request_unique');
            $table->index(['work_date', 'user_id']);
        });
        Schema::create('damage_report_confirmations', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('laporan_kerusakan_id')->constrained('laporan_kerusakan')->restrictOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['laporan_kerusakan_id', 'user_id'], 'damage_confirmation_unique');
        });
        Schema::create('damage_report_notifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('laporan_kerusakan_id')->constrained('laporan_kerusakan')->restrictOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->restrictOnDelete();
            $table->string('event', 30);
            $table->string('status', 20)->default('pending');
            $table->unsignedInteger('attempts')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
            $table->unique(['laporan_kerusakan_id', 'user_id', 'event'], 'damage_notification_unique');
        });

        // Only location facts are backfilled; old status, money and physical occupancy are untouched.
        DB::table('laporan_kerusakan')->orderBy('id')->chunkById(200, function ($reports): void {
            foreach ($reports as $report) {
                $asset = $report->aset_id ? DB::table('aset')->find($report->aset_id) : null;
                $roomId = $report->kamar_id ?: $asset?->kamar_id;
                $buildingId = $roomId ? DB::table('kamar')->join('lantai', 'lantai.id', '=', 'kamar.lantai_id')->where('kamar.id', $roomId)->value('lantai.gedung_id') : null;
                $facilityId = $asset?->fasilitas_umum_id;
                if (! $buildingId && $facilityId) {
                    $buildingId = DB::table('fasilitas_umum')->where('id', $facilityId)->value('gedung_id');
                }
                DB::table('laporan_kerusakan')->where('id', $report->id)->update(['gedung_id' => $buildingId, 'fasilitas_umum_id' => $facilityId]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('damage_report_notifications');
        Schema::dropIfExists('damage_report_confirmations');
        Schema::dropIfExists('damage_report_progress');
        Schema::table('laporan_kerusakan_assignments', fn (Blueprint $table) => $table->dropColumn('role'));
        Schema::table('laporan_kerusakan', function (Blueprint $table): void {
            $table->dropForeign(['gedung_id']);
            $table->dropForeign(['fasilitas_umum_id']);
            $table->dropForeign(['cancelled_by']);
            $table->dropUnique('damage_report_request_unique');
            $table->dropIndex('damage_report_building_status_idx');
            $table->dropColumn(['gedung_id', 'fasilitas_umum_id', 'source', 'location_label', 'priority', 'different_incident_reason', 'request_key', 'request_hash', 'completion_hash', 'cancellation_reason', 'cancelled_by', 'is_blocked']);
        });
    }
};
