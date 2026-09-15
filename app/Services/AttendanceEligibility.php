<?php

namespace App\Services;

use App\Enums\ResidenceEvent;
use App\Models\MahasiswaProfil;
use Carbon\CarbonInterface;

class AttendanceEligibility
{
    public function isEligible(MahasiswaProfil $student, CarbonInterface $at): bool
    {
        $firstEntry = $student->residenceHistories()
            ->whereIn('event', [ResidenceEvent::Entered->value, ResidenceEvent::Reentered->value])
            ->where('occurred_at', '<=', $at)
            ->oldest('occurred_at')
            ->first();

        $firstResidenceDate = $firstEntry?->occurred_at ?? $student->tanggal_masuk;

        if ($firstResidenceDate === null || $firstResidenceDate->diffInYears($at) >= 1) {
            return false;
        }

        $latestEvent = $student->residenceHistories()
            ->where('occurred_at', '<=', $at)
            ->latest('occurred_at')
            ->first();

        return $latestEvent?->event !== ResidenceEvent::CheckedOut
            && in_array($student->status_huni, ['aktif', 'izin_pulang'], true);
    }
}
