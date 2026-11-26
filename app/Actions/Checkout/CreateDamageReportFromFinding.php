<?php

namespace App\Actions\Checkout;

use App\Enums\LaporanKerusakanStatus;
use App\Models\Kamar;
use App\Models\LaporanKerusakan;
use App\Models\RoomInspectionFinding;
use App\Models\User;
use App\Notifications\ResidenceWorkflowNotification;
use Illuminate\Support\Facades\DB;

class CreateDamageReportFromFinding
{
    public function handle(RoomInspectionFinding $finding, string $reporterId): LaporanKerusakan
    {
        $report = DB::transaction(function () use ($finding, $reporterId): LaporanKerusakan {
            $lockedFinding = RoomInspectionFinding::query()
                ->with(['inspection.checkoutRequest.placement.kamar.lantai.gedung', 'inspection.checkoutRequest.mahasiswa.user'])
                ->lockForUpdate()
                ->findOrFail($finding->id);

            if ($lockedFinding->laporan_kerusakan_id) {
                return LaporanKerusakan::findOrFail($lockedFinding->laporan_kerusakan_id);
            }

            $room = $lockedFinding->inspection->checkoutRequest->placement->kamar;
            Kamar::whereKey($room->id)->lockForUpdate()->firstOrFail();

            if ($lockedFinding->aset_id !== null) {
                $existing = LaporanKerusakan::where('kamar_id', $room->id)
                    ->where('aset_id', $lockedFinding->aset_id)
                    ->whereNotIn('status', [LaporanKerusakanStatus::Selesai, LaporanKerusakanStatus::Dibatalkan])
                    ->first();
                if ($existing) {
                    $lockedFinding->update(['laporan_kerusakan_id' => $existing->id]);
                    $existing->statusHistories()->create([
                        'from_status' => $existing->status,
                        'to_status' => $existing->status,
                        'changed_by' => $reporterId,
                        'description' => 'Temuan checkout ditautkan ke kejadian aktif: '.$lockedFinding->description,
                    ]);

                    return $existing;
                }
            }

            $report = LaporanKerusakan::create([
                'gedung_id' => $room->lantai->gedung_id,
                'source' => 'checkout',
                'location_label' => 'Kamar '.$room->nomor_kamar,
                'nomor_tiket' => LaporanKerusakan::generateReportNumber($room->lantai->gedung, $room),
                'aset_id' => $lockedFinding->aset_id,
                'kamar_id' => $lockedFinding->inspection->checkoutRequest->placement->kamar_id,
                'dilaporkan_oleh' => $reporterId,
                'deskripsi' => $lockedFinding->description,
                'status' => LaporanKerusakanStatus::MenungguTriage,
                'tanggal_lapor' => now(),
            ]);
            $report->statusHistories()->create([
                'to_status' => LaporanKerusakanStatus::MenungguTriage,
                'changed_by' => $reporterId,
                'description' => 'Dibuat dari temuan pemeriksaan checkout GO.',
            ]);

            $report->items()->create([
                'aset_id' => $lockedFinding->aset_id,
                'reported_by' => $reporterId,
                'description' => $lockedFinding->description,
                'location_label' => 'Kamar '.$room->nomor_kamar,
            ]);

            $lockedFinding->update(['laporan_kerusakan_id' => $report->id]);

            return $report;
        });

        $this->notifyFacilitatorAndLeadership($finding->fresh(['inspection.checkoutRequest.placement.kamar.lantai.gedung', 'inspection.checkoutRequest.mahasiswa.user']), $report);

        return $report;
    }

    private function notifyFacilitatorAndLeadership(?RoomInspectionFinding $finding, LaporanKerusakan $report): void
    {
        $room = $finding?->inspection?->checkoutRequest?->placement?->kamar;
        $building = $room?->lantai?->gedung;
        if ($room === null || $building === null) {
            return;
        }

        $studentName = $finding->inspection->checkoutRequest->mahasiswa?->user->nama ?? 'Penghuni';
        $severity = str_replace('_', ' ', (string) ($finding->severity ?? 'rusak'));
        $subject = 'Temuan Kerusakan Kamar Checkout';
        $message = "GO melaporkan kerusakan pada {$building->nama_gedung} Kamar {$room->nomor_kamar} (checkout {$studentName}) [{$severity}]: {$finding->description}. Nomor laporan: {$report->nomor_tiket}.";

        $facilitators = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'fasilitator')->where('guard_name', 'web'))
            ->whereHas('fasilitatorWilayah', fn ($q) => $q->where('gedung_id', $building->id))
            ->get();
        $leaders = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'pimpinan')->where('guard_name', 'web'))
            ->get();

        $registrationId = $finding->inspection->checkoutRequest->placement->registration?->id;
        foreach ($facilitators->merge($leaders)->unique('id') as $recipient) {
            $recipient->notify(new ResidenceWorkflowNotification($subject, $message, $registrationId));
        }
    }
}
