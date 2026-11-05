<?php

namespace App\Actions\Checkout;

use App\Enums\RoomInspectionStatus;
use App\Models\CheckoutRequest;
use App\Models\Kamar;
use App\Models\ResidenceRegistration;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\ResidenceWorkflowAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReturnResidenceKeys
{
    public function handle(ResidenceRegistration $registration, User $officer, string $condition, string $notes): void
    {
        DB::transaction(function () use ($registration, $officer, $condition, $notes): void {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            abort_unless(ResidenceWorkflowAccess::officer($officer, $r), 403);
            if ($r->keys_returned_at) {
                return;
            }
            if (! $r->completed_at || ! $r->placement) {
                throw ValidationException::withMessages(['keys' => 'Belum ada hunian aktif untuk diselesaikan.']);
            }
            $checkout = CheckoutRequest::where('penempatan_kamar_id', $r->penempatan_kamar_id)->where('status', '!=', 'ditolak')->latest()->lockForUpdate()->first();
            if ($r->workflow_version === 2 && $checkout?->inspection?->status !== RoomInspectionStatus::Selesai) {
                throw ValidationException::withMessages(['keys' => 'Pemeriksaan kamar oleh petugas inspeksi harus selesai sebelum kunci diterima dan okupansi dilepas.']);
            }
            if ($checkout?->inspection?->findings()->exists()) {
                $condition = 'damaged';
            }
            $placement = $r->placement()->lockForUpdate()->firstOrFail();
            $student = $r->studentProfile()->lockForUpdate()->firstOrFail();
            $room = Kamar::whereKey($placement->kamar_id)->lockForUpdate()->firstOrFail();
            $placement->update(['status' => 'berakhir', 'tanggal_selesai' => today()]);
            $student->update(['status_huni' => 'keluar']);
            $student->residenceHistories()->create(['event' => 'checked_out', 'occurred_at' => now()]);
            $count = $room->penempatanKamar()->where('status', 'aktif')->count();
            $room->update(['status' => $condition === 'damaged' || $room->status === 'maintenance' ? 'maintenance' : ($count === 0 ? 'kosong' : ($count >= $room->kapasitas ? 'penuh' : 'terisi_sebagian'))]);
            $r->update(['keys_returned_at' => now(), 'keys_returned_by' => $officer->id, 'return_condition' => $condition, 'ended_at' => now(), 'allocation_status' => 'released']);
            $checkout?->update(['status' => 'selesai', 'selesai_at' => now(), 'diproses_oleh' => $officer->id]);
            AuditLogService::log($officer, 'residence_keys_returned', $r, null, ['condition' => $condition, 'notes' => $notes]);
        });
    }
}
