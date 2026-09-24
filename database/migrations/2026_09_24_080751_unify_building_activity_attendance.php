<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $archive = ['assignments' => DB::table('fasilitator_wilayah')->get(), 'activities' => DB::table('kegiatan')->get(), 'sessions' => DB::table('attendance_sessions')->get()];
        if (! Storage::disk('local')->put('backups/activity-unification-'.now()->format('Ymd-His-u').'.json', json_encode($archive, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT))) {
            throw new RuntimeException('Cadangan kegiatan gagal dibuat.');
        }
        if (! Schema::hasTable('jenis_kegiatan')) {
            Schema::create('jenis_kegiatan', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('nama', 100)->unique();
                $table->boolean('is_other')->default(false);
                $table->timestamps();
            });
        }
        foreach (['Sholat Subuh', 'Lainnya'] as $name) {
            DB::table('jenis_kegiatan')->insertOrIgnore(['id' => (string) Str::uuid(), 'nama' => $name, 'is_other' => $name === 'Lainnya', 'created_at' => now(), 'updated_at' => now()]);
        }
        if (! Schema::hasColumn('kegiatan', 'jenis_kegiatan_id')) {
            Schema::table('kegiatan', function (Blueprint $table): void {
                $table->foreignUuid('jenis_kegiatan_id')->nullable()->constrained('jenis_kegiatan')->restrictOnDelete();
            });
        }
        if (Schema::hasColumn('kegiatan', 'lokasi')) {
            Schema::table('kegiatan', fn (Blueprint $table) => $table->dropColumn('lokasi'));
        }
        DB::table('kegiatan')->whereNull('jenis_kegiatan_id')->update(['jenis_kegiatan_id' => DB::table('jenis_kegiatan')->where('is_other', true)->value('id')]);
        /** Conflicting old assignments require reassignment rather than guessing a building. */
        if (Schema::hasColumn('fasilitator_wilayah', 'lantai_id')) {
            foreach (DB::table('fasilitator_wilayah')->get()->groupBy('user_id') as $userId => $rows) {
                $buildings = $rows->map(fn ($row) => $row->gedung_id ?? DB::table('lantai')->where('id', $row->lantai_id)->value('gedung_id'))->filter()->unique();
                if ($buildings->count() !== 1) {
                    DB::table('fasilitator_wilayah')->where('user_id', $userId)->delete();

                    continue;
                }
                DB::table('fasilitator_wilayah')->where('user_id', $userId)->where('id', '!=', $rows->first()->id)->delete();
                DB::table('fasilitator_wilayah')->where('id', $rows->first()->id)->update(['gedung_id' => $buildings->first()]);
            }
            Schema::table('fasilitator_wilayah', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('lantai_id');

            });
        }
        if (! Schema::hasIndex('fasilitator_wilayah', ['user_id'], 'unique')) {
            Schema::table('fasilitator_wilayah', fn (Blueprint $table) => $table->unique('user_id'));
        }
        /** Keep historical scans when splitting old activities with multiple QR sessions. */
        foreach (DB::table('attendance_sessions')->orderBy('opens_at')->get()->groupBy('kegiatan_id') as $activityId => $sessions) {
            $activity = (array) DB::table('kegiatan')->where('id', $activityId)->first();
            foreach ($sessions as $index => $session) {
                $id = $index === 0 ? $activityId : (string) Str::uuid();
                $data = [...$activity, 'id' => $id, 'tanggal_mulai' => $session->opens_at, 'tanggal_selesai' => $session->expires_at];
                if ($index > 0) {
                    DB::table('kegiatan')->insert($data);
                    DB::table('attendance_sessions')->where('id', $session->id)->update(['kegiatan_id' => $id]);
                } else {
                    DB::table('kegiatan')->where('id', $id)->update($data);
                }
            }
        }
        if (! Schema::hasColumn('attendance_sessions', 'qr_token')) {
            Schema::table('attendance_sessions', function (Blueprint $table): void {
                $table->text('qr_token')->nullable();

            });
        }
        if (! Schema::hasIndex('attendance_sessions', ['kegiatan_id'], 'unique')) {
            Schema::table('attendance_sessions', fn (Blueprint $table) => $table->unique('kegiatan_id'));
        }
        DB::table('attendance_sessions')->whereNull('qr_token')->whereNull('closed_at')->update(['closed_at' => now()]);
        if (! Schema::hasColumn('activity_attendances', 'is_present')) {
            Schema::table('activity_attendances', function (Blueprint $table): void {
                $table->uuid('attendance_attempt_id')->nullable()->change();
                $table->boolean('is_present')->default(true);
                $table->text('correction_reason')->nullable();
                $table->foreignUuid('corrected_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('corrected_at')->nullable();
            });
        }
        if (! Schema::hasTable('attendance_participants')) {
            Schema::create('attendance_participants', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('attendance_session_id')->constrained()->cascadeOnDelete();
                $table->foreignUuid('mahasiswa_id')->constrained('mahasiswa_profil')->cascadeOnDelete();
                $table->string('floor', 100);
                $table->string('room', 100);
                $table->timestamps();

            });
        }
        if (! Schema::hasIndex('attendance_participants', ['attendance_session_id', 'mahasiswa_id'], 'unique')) {
            Schema::table('attendance_participants', fn (Blueprint $table) => $table->unique(['attendance_session_id', 'mahasiswa_id'], 'attendance_participant_unique'));
        }
        foreach (DB::table('activity_attendances')->get() as $attendance) {
            DB::table('attendance_participants')->insertOrIgnore(['id' => (string) Str::uuid(), 'attendance_session_id' => $attendance->attendance_session_id, 'mahasiswa_id' => $attendance->mahasiswa_id, 'floor' => 'Riwayat sebelum pembaruan', 'room' => '-', 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException('Pulihkan cadangan database untuk mengembalikan struktur kegiatan lama.');
    }
};
