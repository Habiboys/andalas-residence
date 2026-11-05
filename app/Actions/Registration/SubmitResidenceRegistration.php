<?php

namespace App\Actions\Registration;

use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\ResidenceRegistration;
use App\Services\ResidenceLifecycle;
use App\Services\ResidencePolicyService;
use App\Services\RoomReservations;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmitResidenceRegistration
{
    /** @param array<string, mixed> $data */
    public function handle(MahasiswaProfil $student, array $data): ResidenceRegistration
    {
        return DB::transaction(function () use ($student, $data): ResidenceRegistration {
            $student = MahasiswaProfil::whereKey($student->id)->lockForUpdate()->firstOrFail();
            if ($student->user->status !== 'aktif' && $student->user->inactive_reason !== 'letter_issued') {
                throw ValidationException::withMessages(['periode_id' => 'Akun tidak aktif.']);
            }
            app(ResidencePolicyService::class)->assertProfile($student);
            $life = app(ResidenceLifecycle::class);
            if (! $life->isLocal($student)) {
                throw ValidationException::withMessages(['periode_id' => 'Permohonan internasional/S2/S3 dicatat melalui pengelola.']);
            }
            app(RoomReservations::class)->expire();
            if ($student->penempatanKamar()->where('status', 'aktif')->exists() || $student->residenceRegistrations()->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected'])->exists()) {
                throw ValidationException::withMessages(['periode_id' => 'Selesaikan hunian atau pendaftaran yang sedang berjalan.']);
            }
            $period = Periode::where('status', 'aktif')->whereKey($data['periode_id'])->firstOrFail();
            $startsAt = Carbon::parse($data['starts_at'] ?? $period->tanggal_mulai)->startOfDay();
            $endsAt = Carbon::parse($data['ends_at'] ?? $period->tanggal_selesai)->startOfDay();
            if ($startsAt->lt($period->tanggal_mulai) || $endsAt->gt($period->tanggal_selesai) || $endsAt->lt($startsAt)) {
                throw ValidationException::withMessages(['ends_at' => 'Masa hunian harus berada dalam rentang periode pendaftaran.']);
            }
            $kipk = $life->isKipk($student);
            $policy = app(ResidencePolicyService::class)->current($kipk ? 'local_kipk' : 'local_non_kipk');
            $unit = $kipk ? 'year' : ($data['rate_unit'] ?? 'year');
            $unit = $unit === 'period' ? 'year' : $unit;
            if ($unit === 'month' && ((int) $student->angkatan === (int) $period->angkatan_maba || ! ($policy->settings['monthly_allowed'] ?? false))) {
                throw ValidationException::withMessages(['rate_unit' => 'Skema bulanan hanya untuk non-maba yang diizinkan kebijakan pengelola.']);
            }
            if (($data['funding'] ?? 'personal') !== 'personal') {
                throw ValidationException::withMessages(['funding' => 'Mahasiswa lokal memiliki kewajiban pembayaran pribadi.']);
            }
            $student->user->update(['client_profile_category' => $kipk ? 'local_kipk' : 'local_non_kipk']);
            $r = ResidenceRegistration::create([
                'workflow_version' => 2, 'residence_policy_id' => $policy->id,
                'student_profile_id' => $student->id, 'periode_id' => $period->id,
                'status' => 'submitted', 'is_kipk' => $kipk, 'submitted_at' => now(), 'notes' => $data['notes'] ?? null,
                'billing_basis' => $kipk ? 'person' : ($data['billing_basis'] ?? 'person'),
                'starts_at' => $data['starts_at'] ?? $period->tanggal_mulai,
                'ends_at' => $data['ends_at'] ?? $period->tanggal_selesai,
                'rate_unit' => $unit, 'funding' => 'personal', 'allocation_status' => 'waiting',
                'reservation_expires_at' => null,
            ]);
            if (! $kipk) {
                $roomId = $data['preferences'][0]['kamar_id'] ?? null;
                if (! $roomId) {
                    throw ValidationException::withMessages(['preferences' => 'Pilih satu kamar.']);
                }
                $r->roomPreferences()->create(['kamar_id' => $roomId, 'priority' => 1]);
            }
            $r->statusHistories()->create(['from_status' => 'draft', 'to_status' => 'submitted', 'changed_by' => $student->user_id]);
            app(AllocateResidenceRoom::class)->handle($r, $kipk ? null : $roomId);

            return $r->fresh(['roomPreferences', 'statusHistories']);
        }, 3);
    }
}
