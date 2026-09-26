<?php

namespace App\Services;

use App\Models\MahasiswaProfil;
use Carbon\CarbonInterface;

class AttendanceEligibility
{
    public function isEligible(MahasiswaProfil $student, CarbonInterface $at): bool
    {
        return $student->user?->status === 'aktif'
            && $student->status_huni === 'aktif'
            && $student->penempatanKamar()->where('status', 'aktif')->exists()
            && app(ResidenceLifecycle::class)->isBinaan($student);
    }
}
