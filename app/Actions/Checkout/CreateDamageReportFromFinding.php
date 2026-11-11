<?php

namespace App\Actions\Checkout;

use App\Enums\LaporanKerusakanStatus;
use App\Models\LaporanKerusakan;
use App\Models\RoomInspectionFinding;
use App\Models\Kamar;
use Illuminate\Support\Facades\DB;

class CreateDamageReportFromFinding
{
    public function handle(RoomInspectionFinding $finding, string $reporterId): LaporanKerusakan
    {
        return DB::transaction(function () use ($finding, $reporterId) {
            $lockedFinding = RoomInspectionFinding::query()
                ->with('inspection.checkoutRequest.placement')
                ->lockForUpdate()
                ->findOrFail($finding->id);

            if ($lockedFinding->laporan_kerusakan_id) {
                return LaporanKerusakan::findOrFail($lockedFinding->laporan_kerusakan_id);
            }

            $room = $lockedFinding->inspection->checkoutRequest->placement->kamar;
            Kamar::whereKey($room->id)->lockForUpdate()->firstOrFail();
            $existing = LaporanKerusakan::where('kamar_id', $room->id)->where('aset_id', $lockedFinding->aset_id)
                ->whereNotIn('status', [LaporanKerusakanStatus::Selesai, LaporanKerusakanStatus::Dibatalkan])->first();
            if ($existing) {
                $lockedFinding->update(['laporan_kerusakan_id' => $existing->id]);
                $existing->statusHistories()->create(['from_status' => $existing->status, 'to_status' => $existing->status, 'changed_by' => $reporterId, 'description' => 'Temuan checkout ditautkan ke kejadian aktif: '.$lockedFinding->description]);
                return $existing;
            }
            $report = LaporanKerusakan::create([
                'gedung_id' => $room->lantai->gedung_id,
                'source' => 'checkout',
                'location_label' => 'Kamar '.$room->nomor_kamar,
                'nomor_tiket' => 'GO-'.$lockedFinding->id,
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
                'description' => 'Dibuat dari temuan checkout.',
            ]);

            $lockedFinding->update(['laporan_kerusakan_id' => $report->id]);

            return $report;
        });
    }
}
