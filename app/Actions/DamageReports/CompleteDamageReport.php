<?php

namespace App\Actions\DamageReports;

use App\Models\LaporanKerusakan;
use App\Models\User;
use App\Services\DamageReportWorkflow;

class CompleteDamageReport
{
    public function handle(LaporanKerusakan $report, User $technician, string $description, array $evidencePaths, ?string $requestHash = null): LaporanKerusakan
    {
        return app(DamageReportWorkflow::class)->complete($report, $technician, $description, $evidencePaths, $requestHash);
    }
}
