<?php

use App\Actions\Registration\SubmitResidenceRegistration;
use App\Models\MahasiswaProfil;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! preg_match('/^andalas_workflow_test_\d+$/', DB::connection()->getDatabaseName())) {
    exit(4);
}
Queue::fake();
Notification::fake();
$limit = microtime(true) + 20;
while (! file_exists($argv[4])) {
    if (microtime(true) > $limit) {
        exit(5);
    } usleep(10000);
}
try {
    $student = MahasiswaProfil::findOrFail($argv[1]);
    app(SubmitResidenceRegistration::class)->handle($student, ['periode_id' => $argv[2], 'preferences' => [['kamar_id' => $argv[3]]]]);
    echo json_encode(['result' => 'allocated']);
} catch (ValidationException $exception) {
    echo json_encode(['result' => 'rejected', 'fields' => array_keys($exception->errors())]);
}
