<?php

namespace App\Actions\DamageReports;

use App\Models\LaporanKerusakan;
use App\Models\User;
use App\Services\DamageReportWorkflow;

class CompleteDamageReport
{
    /**
     * @param  list<string>  $evidencePaths
     * @param  list<string>|null  $participants
     */
    public function handle(LaporanKerusakan $report, User $technician, string $description, array $evidencePaths, ?string $requestHash = null, ?array $participants = null): LaporanKerusakan
    {
        return app(DamageReportWorkflow::class)->complete($report, $technician, $description, $evidencePaths, $requestHash, $participants);
    }
}
