<?php

use App\Models\MahasiswaProfil;
use App\Models\ResidenceRegistration;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Symfony\Component\Process\Process;
use Tests\TestCase;

uses(TestCase::class);

it('serializes simultaneous requests for the final bed on MySQL', function () {
    if (DB::connection()->getDriverName() !== 'mysql' || ! preg_match('/^andalas_workflow_test_\d+$/', DB::connection()->getDatabaseName())) {
        $this->markTestSkipped('Requires an explicitly isolated and migrated MySQL test database.');
    }
    Queue::fake();
    Notification::fake();
    $f = toBeFixture(capacity: 1);
    $second = User::factory()->student()->create(['gender' => 'perempuan'])->assignRole('mahasiswa');
    $profile = MahasiswaProfil::create(['user_id' => $second->id, 'prodi_id' => $f['program']->id, 'angkatan' => '2025', 'barcode_code' => fake()->uuid()]);
    $config = DB::connection()->getConfig();
    $env = ['APP_ENV' => 'testing', 'DB_CONNECTION' => 'mysql', 'DB_HOST' => $config['host'], 'DB_PORT' => (string) $config['port'], 'DB_DATABASE' => $config['database'], 'DB_USERNAME' => $config['username'], 'DB_PASSWORD' => $config['password'], 'DB_URL' => '', 'CACHE_STORE' => 'array', 'QUEUE_CONNECTION' => 'sync', 'SESSION_DRIVER' => 'array', 'MAIL_MAILER' => 'array'];
    $gate = storage_path('framework/testing/allocation-race-'.fake()->uuid());
    $processes = [];
    foreach ([$f['profile']->id, $profile->id] as $id) {
        $process = new Process([PHP_BINARY, base_path('tests/Support/allocate-residence-worker.php'), $id, $f['period']->id, $f['room']->id, $gate], base_path(), $env, timeout: 45);
        $process->start();
        $processes[] = $process;
    }
    touch($gate);
    try {
        $results = [];
        foreach ($processes as $process) {
            $process->wait();
            expect($process->isSuccessful())->toBeTrue($process->getErrorOutput().$process->getOutput());
            $results[] = json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR)['result'];
        }
        sort($results);
        expect($results)->toBe(['allocated', 'rejected']);
        expect(ResidenceRegistration::where('reserved_room_id', $f['room']->id)->count())->toBe(1);
        $this->assertDatabaseCount('tagihan', 1);
        $this->assertDatabaseCount('penempatan_kamar', 0);
    } finally {
        if (file_exists($gate)) {
            unlink($gate);
        }
        foreach ($processes as $process) {
            if ($process->isRunning()) {
                $process->stop();
            }
        }
    }
});
