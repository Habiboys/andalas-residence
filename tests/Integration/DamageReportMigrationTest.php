<?php

use App\Enums\LaporanKerusakanStatus as Status;
use App\Models\LaporanKerusakan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class);

it('backfills a single legacy item without changing old reports evidence or physical occupancy', function () {
    if (DB::connection()->getDriverName() !== 'mysql' || ! preg_match('/^andalas_damage_test_[a-z0-9_]+$/', DB::connection()->getDatabaseName())) {
        $this->markTestSkipped('Requires an explicitly isolated MySQL database; DDL is intentionally outside transactional feature fixtures.');
    }
    $migration = require database_path('migrations/2026_11_11_090000_add_damage_items_logbooks_and_complaints.php');
    $migration->down();
    $fixture = toBeFixture();
    $f = ['user' => $fixture['user'], 'room' => $fixture['room']];
    $r = LaporanKerusakan::create(['nomor_tiket' => 'LEGACY-UAT', 'kamar_id' => $f['room']->id, 'gedung_id' => $f['room']->lantai->gedung_id, 'dilaporkan_oleh' => $f['user']->id, 'deskripsi' => 'Catatan lama', 'status' => Status::MenungguTriage, 'tanggal_lapor' => now()]);
    $r->photos()->create(['path' => 'before/legacy.jpg', 'type' => 'before', 'uploaded_by' => $f['user']->id]);
    $r->statusHistories()->create(['to_status' => Status::MenungguTriage, 'changed_by' => $f['user']->id, 'description' => 'Histori lama']);
    $tables = ['laporan_kerusakan', 'laporan_kerusakan_status_histories', 'laporan_kerusakan_assignments', 'penempatan_kamar', 'tagihan', 'pembayaran'];
    $snapshot = [];
    foreach ($tables as $table) { $snapshot[$table] = \Illuminate\Support\Facades\DB::table($table)->orderBy('id')->get()->toJson(); }
    $migration->up();
    foreach ($tables as $table) { expect(\Illuminate\Support\Facades\DB::table($table)->orderBy('id')->get()->toJson())->toBe($snapshot[$table]); }
    expect($r->items()->sole()->description)->toBe('Catatan lama')->and($r->items()->sole()->legacy)->toBeTrue();
    expect($r->photos()->sole()->path)->toBe('before/legacy.jpg')->and($r->photos()->sole()->item_id)->toBeNull();
});
