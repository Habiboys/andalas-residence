<?php

namespace App\Actions\DamageReports;

use App\Models\LaporanKerusakan;
use App\Models\User;
use App\Services\DamageReportWorkflow;

class CreateDamageReport
{
    public function handle(User $resident, string $description, array $photoPaths = [], ?string $assetId = null, array $options = []): LaporanKerusakan
    {
        return app(DamageReportWorkflow::class)->resident($resident, $description, $photoPaths, $assetId, $options);
    }
}
