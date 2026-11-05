<?php

namespace App\Actions\Registration;

use App\Models\ResidenceRegistration;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\ResidenceLifecycle;
use App\Services\ResidenceWorkflow;
use App\Services\ResidenceWorkflowAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ConfirmResidenceCheckIn
{
    public function handle(ResidenceRegistration $registration, User $officer): ResidenceRegistration
    {
        return DB::transaction(function () use ($registration, $officer): ResidenceRegistration {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            abort_unless(ResidenceWorkflowAccess::officer($officer, $r), 403);
            if ($r->checked_in_at) {
                return $r;
            }
            if ($r->completed_at) {
                throw ValidationException::withMessages(['checkin' => 'Catatan lama harus dikonfirmasi sebagai histori, bukan check-in baru.']);
            }
            if ($r->starts_at?->isFuture() || $r->ends_at?->isBefore(today())) {
                throw ValidationException::withMessages(['checkin' => 'Tanggal kehadiran berada di luar masa tinggal yang disetujui.']);
            }
            $issues = app(ResidenceWorkflow::class)->blockers($r);
            if ($issues) {
                throw ValidationException::withMessages(['checkin' => implode(' ', $issues)]);
            }
            $student = $r->studentProfile()->lockForUpdate()->firstOrFail();
            $placement = app(PlaceResidenceRegistration::class)->handle($r, $r->reserved_room_id, $officer->id);
            $placement->update(['tanggal_mulai' => today(), 'tanggal_selesai' => $r->ends_at]);
            $event = app(ResidenceLifecycle::class)->hasEndedStay($student) ? 'reentered' : 'entered';
            $student->residenceHistories()->create(['event' => $event, 'occurred_at' => now()]);
            $student->update(['status_huni' => 'aktif', 'tanggal_masuk' => today()]);
            if ($student->user->inactive_reason === 'letter_issued') {
                $student->user->update(['status' => 'aktif', 'inactive_reason' => null]);
            }
            $r->update(['penempatan_kamar_id' => $placement->id, 'completed_at' => now(), 'checked_in_at' => now(), 'checked_in_by' => $officer->id, 'status' => 'accepted', 'reservation_expires_at' => null, 'allocation_status' => 'occupied']);
            AuditLogService::log($officer, 'residence_checkin_keys_handed', $r, null, ['placement_id' => $placement->id]);

            return $r;
        });
    }
}
