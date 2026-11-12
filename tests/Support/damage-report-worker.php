<?php

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (! app()->environment('testing') || ! preg_match('/^andalas_damage_test_[a-z0-9_]+$/', Illuminate\Support\Facades\DB::connection()->getDatabaseName())) {
    throw new RuntimeException('Only explicitly isolated damage test databases are allowed.');
}
[$script, $operation, $actorId, $targetId, $gate] = $argv;
$user = App\Models\User::findOrFail($actorId);
fwrite(STDOUT, "READY\n");
fflush(STDOUT);
touch($gate.'.ready-'.getmypid());
$deadline = microtime(true) + 180;
while (! is_file($gate)) {
    if (microtime(true) > $deadline) {
        throw new RuntimeException('Barrier timeout');
    }
    usleep(20000);
    clearstatcache(true, $gate);
}
$workflow = app(App\Services\DamageReportWorkflow::class);
try {
    $result = match ($operation) {
        'create' => $workflow->resident($user, 'Kejadian yang sama', [], null, ['request_key' => (string) Illuminate\Support\Str::uuid()]),
        'claim' => $workflow->claim(App\Models\LaporanKerusakan::findOrFail($targetId), $user),
        'complete' => $workflow->complete(App\Models\LaporanKerusakan::findOrFail($targetId), $user, 'Perbaikan final', ['after/concurrency.jpg']),
        default => throw new RuntimeException('Unknown operation'),
    };
    echo json_encode(['result' => 'accepted', 'id' => $result->id]).PHP_EOL;
} catch (Illuminate\Auth\Access\AuthorizationException|Illuminate\Validation\ValidationException $exception) {
    echo json_encode(['result' => 'rejected', 'reason' => get_class($exception)]).PHP_EOL;
}
