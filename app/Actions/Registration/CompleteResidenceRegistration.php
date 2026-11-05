<?php

namespace App\Actions\Registration;

use App\Models\ResidenceRegistration;
use App\Services\ResidenceWorkflow;
use Illuminate\Support\Facades\DB;

class CompleteResidenceRegistration
{
    public function handle(ResidenceRegistration $registration): void
    {
        DB::transaction(function () use ($registration): void {
            $registration = ResidenceRegistration::query()->lockForUpdate()->findOrFail($registration->id);
            app(ResidenceWorkflow::class)->evaluate($registration);
        });
    }
}
