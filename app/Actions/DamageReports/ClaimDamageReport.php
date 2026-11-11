<?php

namespace App\Actions\DamageReports;

use App\Models\LaporanKerusakan;
use App\Models\User;
use App\Services\DamageReportWorkflow;

class ClaimDamageReport
{
    public function handle(LaporanKerusakan $report, User $technician): LaporanKerusakan
    {
        return app(DamageReportWorkflow::class)->claim($report, $technician);
    }
}
