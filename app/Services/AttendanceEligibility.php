<?php

namespace App\Services;

use App\Enums\ClientProfileCategory;
use App\Enums\ResidenceEvent;
use App\Models\MahasiswaProfil;
use Carbon\CarbonInterface;

class AttendanceEligibility
{
    public function isEligible(MahasiswaProfil $student, CarbonInterface $at): bool
    {
        $category = $student->user?->client_profile_category;
        if (! in_array($category, [ClientProfileCategory::Student, ClientProfileCategory::LocalKipk, ClientProfileCategory::LocalNonKipk], true)) {
            return false;
        }

        if ((int) $student->angkatan < 2026) {
            return false;
        }

        if ($student->residenceHistories()->whereIn('event', [ResidenceEvent::CheckedOut, ResidenceEvent::Reentered])->where('occurred_at', '<=', $at)->exists()
            || $student->penempatanKamar()->where('status', 'berakhir')->exists()) {
            return false;
        }

        $firstEntry = $student->residenceHistories()
            ->whereIn('event', [ResidenceEvent::Entered->value, ResidenceEvent::Reentered->value])
            ->where('occurred_at', '<=', $at)
            ->oldest('occurred_at')
            ->first();

        $firstResidenceDate = $firstEntry?->occurred_at ?? $student->tanggal_masuk;

        if ($firstResidenceDate === null || $firstResidenceDate->gt($at) || $firstResidenceDate->diffInYears($at) >= 1) {
            return false;
        }

        $latestEvent = $student->residenceHistories()
            ->where('occurred_at', '<=', $at)
            ->latest('occurred_at')
            ->first();

        return $latestEvent?->event !== ResidenceEvent::CheckedOut
            && $student->status_huni === 'aktif';
    }
}
