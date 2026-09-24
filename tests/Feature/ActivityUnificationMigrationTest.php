<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

it('archives retired fields and preserves all scans while upgrading to one QR and one building', function () {
    Storage::fake('local');
    $original = DB::getDefaultConnection();
    config(['database.connections.activity_unification_test' => ['driver' => 'sqlite', 'database' => ':memory:', 'foreign_key_constraints' => true]]);
    DB::setDefaultConnection('activity_unification_test');
    try {
        $path = database_path('migrations/2026_09_24_080751_unify_building_activity_attendance.php');
        foreach (glob(database_path('migrations/*.php')) as $migration) {
            if ($migration < $path) {
                (require $migration)->up();
            }
        }
        $user = User::factory()->create();
        $studentUser = User::factory()->student()->create();
        $buildingIds = [fake()->uuid(), fake()->uuid()];
        foreach ($buildingIds as $index => $id) {
            DB::table('gedung')->insert(['id' => $id, 'kode_gedung' => 'OLD-'.$index, 'nama_gedung' => 'Gedung Lama '.$index]);
            DB::table('fasilitator_wilayah')->insert(['id' => fake()->uuid(), 'user_id' => $user->id, 'gedung_id' => $id]);
        }
        $studentId = fake()->uuid();
        DB::table('mahasiswa_profil')->insert(['id' => $studentId, 'user_id' => $studentUser->id, 'barcode_code' => 'OLD-SCAN']);
        $activityId = fake()->uuid();
        DB::table('kegiatan')->insert(['id' => $activityId, 'judul' => 'Kegiatan lama', 'gedung_id' => $buildingIds[0], 'lokasi' => 'Alamat manual lama', 'tanggal_mulai' => now(), 'tanggal_selesai' => now()->addHour(), 'dibuat_oleh' => $user->id]);
        foreach ([1, 2] as $index) {
            $sessionId = fake()->uuid();
            $attemptId = fake()->uuid();
            DB::table('attendance_sessions')->insert(['id' => $sessionId, 'kegiatan_id' => $activityId, 'facilitator_id' => $user->id, 'qr_token_hash' => hash('sha256', 'old-'.$index),
                'opens_at' => now(), 'expires_at' => now()->addHour(), 'anchor_latitude' => -0.91, 'anchor_longitude' => 100.46, 'radius_meters' => 100, 'maximum_accuracy_meters' => 50]);
            DB::table('attendance_attempts')->insert(['id' => $attemptId, 'attendance_session_id' => $sessionId, 'mahasiswa_id' => $studentId, 'attempted_at' => now()]);
            DB::table('activity_attendances')->insert(['id' => fake()->uuid(), 'attendance_session_id' => $sessionId, 'mahasiswa_id' => $studentId, 'attendance_attempt_id' => $attemptId, 'attended_at' => now()]);
        }
        (require $path)->up();
        expect(DB::table('attendance_sessions')->distinct()->count('kegiatan_id'))->toBe(2);
        expect(DB::table('activity_attendances')->where('is_present', true)->count())->toBe(2);
        expect(DB::table('attendance_participants')->count())->toBe(2);
        expect(DB::table('attendance_sessions')->whereNull('closed_at')->count())->toBe(0);
        expect(DB::table('fasilitator_wilayah')->where('user_id', $user->id)->count())->toBe(0);
        expect(Schema::hasColumn('kegiatan', 'lokasi'))->toBeFalse();
        expect(Schema::hasColumn('fasilitator_wilayah', 'lantai_id'))->toBeFalse();
        $archivePath = collect(Storage::disk('local')->files('backups'))->first(fn ($file) => str_contains($file, 'activity-unification-'));
        $archive = json_decode(Storage::disk('local')->get($archivePath), true);
        expect($archive['activities'][0]['lokasi'])->toBe('Alamat manual lama');
        expect($archive['assignments'])->toHaveCount(2);
        expect($archive['sessions'])->toHaveCount(2);

        Schema::table('attendance_participants', fn ($table) => $table->dropUnique('attendance_participant_unique'));
        (require $path)->up();
        expect(DB::table('attendance_participants')->count())->toBe(2);
        expect(Schema::hasIndex('attendance_participants', ['attendance_session_id', 'mahasiswa_id'], 'unique'))->toBeTrue();
        foreach (Schema::getIndexes('attendance_participants') as $index) {
            expect(strlen($index['name']))->toBeLessThanOrEqual(64);
        }
    } finally {
        DB::setDefaultConnection($original);
        DB::purge('activity_unification_test');
    }
});
