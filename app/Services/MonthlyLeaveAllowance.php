<?php

namespace App\Services;

use App\Models\MahasiswaProfil;
use App\Models\PengajuanIzinPulang;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class MonthlyLeaveAllowance
{
    public function validate(MahasiswaProfil $student, string $startsAt, string $endsAt, ?string $exceptId = null): void
    {
        $start = Carbon::parse($startsAt)->startOfDay();
        $end = Carbon::parse($endsAt)->startOfDay();
        $existing = PengajuanIzinPulang::query()->where('mahasiswa_id', $student->id)
            ->where('jenis', '!=', 'sakit')->where('status', '!=', 'ditolak')
            ->when($exceptId, fn ($query) => $query->whereKeyNot($exceptId))
            ->whereDate('tanggal_mulai', '<=', $end->copy()->endOfMonth())
            ->whereDate('tanggal_kembali', '>=', $start->copy()->startOfMonth())->get();

        for ($month = $start->copy()->startOfMonth(); $month->lte($end); $month = $month->addMonth()) {
            $lastDay = $month->copy()->endOfMonth()->startOfDay();
            $days = [];
            foreach ($existing as $leave) {
                $leaveEnd = $leave->kembali_pada ? $leave->tanggal_kembali->min(Carbon::parse($leave->kembali_pada->copy()->timezone(config('residence.timezone'))->toDateString())) : $leave->tanggal_kembali;
                $this->addDays($days, $leave->tanggal_mulai->max($month), $leaveEnd->min($lastDay));
            }
            $this->addDays($days, $start->copy()->max($month), $end->copy()->min($lastDay));
            if (count($days) > 6) {
                throw ValidationException::withMessages(['tanggal_kembali' => 'Kuota izin maksimal 6 hari per bulan terlampaui pada '.$month->format('m/Y').'. Tanggal mulai dan kembali ikut dihitung.']);
            }
        }
    }

    /** @param array<string, bool> $days */
    private function addDays(array &$days, CarbonInterface $start, CarbonInterface $end): void
    {
        for ($day = $start->copy(); $day->lte($end); $day = $day->addDay()) {
            $days[$day->toDateString()] = true;
        }
    }
}
