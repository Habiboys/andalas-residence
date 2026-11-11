<?php

use App\Enums\LaporanKerusakanStatus;
use App\Models\Gedung;
use App\Models\Aset;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\LaporanKerusakan;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\User;
use App\Services\DamageReportWorkflow;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Symfony\Component\Process\Process;
use Tests\TestCase;

uses(TestCase::class);

it('serializes damage report operations across independent MySQL workers', function (string $operation) {
    if (DB::connection()->getDriverName() !== 'mysql' || ! preg_match('/^andalas_damage_test_[a-z0-9_]+$/', DB::connection()->getDatabaseName())) {
        $this->markTestSkipped('Requires an explicitly isolated and migrated MySQL damage test database.');
    }
    Role::findOrCreate('mahasiswa'); Role::findOrCreate('teknisi');
    $building = Gedung::create(['kode_gedung' => 'R-'.Str::random(8), 'nama_gedung' => 'Race']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Satu']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => 'R-'.Str::random(8), 'kapasitas' => 2, 'status' => 'terisi_sebagian']);
    $residents = collect(range(1, 2))->map(function () use ($room): User {
        $u = User::factory()->create(); $u->assignRole('mahasiswa');
        $p = MahasiswaProfil::create(['user_id' => $u->id, 'barcode_code' => (string) Str::uuid(), 'status_huni' => 'aktif']);
        PenempatanKamar::create(['mahasiswa_id' => $p->id, 'kamar_id' => $room->id, 'tanggal_mulai' => today()->toDateString(), 'status' => 'aktif']);
        return $u;
    });
    $technicians = collect(range(1, 2))->map(function (): User { $u = User::factory()->create(); $u->assignRole('teknisi'); return $u; });
    $asset = $operation === 'asset-complete' ? Aset::create(['kamar_id' => $room->id, 'kode_inventaris' => 'R-'.Str::uuid(), 'nama_aset' => 'Keran', 'kategori' => 'Air', 'kondisi' => 'rusak_ringan']) : null;
    $report = $operation === 'create' ? null : app(DamageReportWorkflow::class)->resident($residents[0], 'Kejadian yang sama', [], $asset?->id);
    if (in_array($operation, ['complete', 'asset-complete'], true)) { $report = app(DamageReportWorkflow::class)->claim($report, $technicians[0]); }
    $targets = [$report, $report];
    if ($asset) {
        $second = app(DamageReportWorkflow::class)->resident($residents[0], 'Kejadian terpisah pada aset sama', [], $asset->id, ['different_incident_reason' => 'Kerusakan berbeda']);
        $targets[1] = app(DamageReportWorkflow::class)->claim($second, $technicians[1]);
    }
    $actors = $operation === 'create' ? $residents->all() : ($operation === 'complete' ? [$technicians[0], $technicians[0]] : $technicians->all());
    $config = DB::connection()->getConfig();
    $env = ['APP_ENV' => 'testing', 'DB_CONNECTION' => 'mysql', 'DB_HOST' => $config['host'], 'DB_PORT' => (string) $config['port'], 'DB_DATABASE' => $config['database'], 'DB_USERNAME' => $config['username'], 'DB_PASSWORD' => $config['password'], 'DB_URL' => '', 'CACHE_STORE' => 'array', 'QUEUE_CONNECTION' => 'sync', 'SESSION_DRIVER' => 'array', 'MAIL_MAILER' => 'array'];
    $gate = storage_path('framework/testing/damage-race-'.Str::uuid());
    if (! is_dir(dirname($gate))) { mkdir(dirname($gate), 0777, true); }
    $processes = [];
    try {
        foreach ($actors as $index => $actor) {
            $process = new Process([PHP_BINARY, base_path('tests/Support/damage-report-worker.php'), $operation === 'asset-complete' ? 'complete' : $operation, $actor->id, $targets[$index]?->id ?? '-', $gate], base_path(), $env, timeout: 240);
            $process->start(); $processes[] = $process;
        }
        foreach ($processes as $process) {
            $ready = $process->waitUntil(fn ($type, $output) => str_contains($output, 'READY'));
            expect($ready)->toBeTrue($process->getErrorOutput().$process->getOutput());
        }
        touch($gate);
        $results = [];
        foreach ($processes as $process) {
            $process->wait();
            expect($process->isSuccessful())->toBeTrue($process->getErrorOutput().$process->getOutput());
            $lines = array_values(array_filter(explode("\n", trim($process->getOutput())), fn ($line) => str_starts_with($line, '{')));
            $results[] = json_decode(end($lines), true, flags: JSON_THROW_ON_ERROR)['result'];
        }
        sort($results);
        expect($results)->toBe(in_array($operation, ['complete', 'asset-complete'], true) ? ['accepted', 'accepted'] : ['accepted', 'rejected']);
        $report = LaporanKerusakan::where('kamar_id', $room->id)->firstOrFail();
        if ($operation === 'create') { expect($report->status)->toBe(LaporanKerusakanStatus::MenungguTriage); }
        if ($operation === 'claim') { expect($report->assignments()->count())->toBe(1)->and($report->statusHistories()->count())->toBe(2); }
        if ($operation === 'complete') { expect($report->photos()->count())->toBe(1)->and($report->statusHistories()->count())->toBe(3); }
        if ($asset) { expect($asset->fresh()->kondisi->value)->toBe('baik')->and(LaporanKerusakan::where('kamar_id', $room->id)->where('status', LaporanKerusakanStatus::Selesai)->count())->toBe(2); }
    } finally {
        if (is_file($gate)) { unlink($gate); }
        foreach ($processes as $process) { if ($process->isRunning()) { $process->stop(); } }
    }
})->with(['create', 'claim', 'complete', 'asset-complete']);
