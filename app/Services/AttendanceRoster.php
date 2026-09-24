<?php

namespace App\Services;

use App\Models\AttendanceSession;
use App\Models\PenempatanKamar;

class AttendanceRoster
{
    public function capture(AttendanceSession $session): void
    {
        $eligibility = app(AttendanceEligibility::class);
        $placements = PenempatanKamar::with(['mahasiswa.user', 'kamar.lantai'])->where('status', 'aktif')
            ->whereHas('kamar.lantai', fn ($query) => $query->where('gedung_id', $session->kegiatan->gedung_id))->get();
        foreach ($placements as $placement) {
            if ($eligibility->isEligible($placement->mahasiswa, $session->opens_at)) {
                $session->participants()->firstOrCreate(['mahasiswa_id' => $placement->mahasiswa_id], [
                    'floor' => $placement->kamar->lantai->nama_lantai,
                    'room' => $placement->kamar->nomor_kamar,
                ]);
            }
        }
    }
}
