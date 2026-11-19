<?php

namespace App\Actions\Registration;

use App\Models\Kamar;
use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\ResidenceRegistration;
use App\Services\ResidenceLifecycle;
use App\Services\ResidencePolicyService;
use App\Services\ResidenceWorkflow;
use App\Services\RoomInvitationService;
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
            if ($student->penempatanKamar()->where('status', 'aktif')->exists() || $student->residenceRegistrations()->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected', 'cancelled'])->exists()) {
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
            $deadline = app(ResidencePolicyService::class)->registrationDeadline($policy);
            $unit = $kipk ? 'year' : ($data['rate_unit'] ?? 'year');
            $unit = $unit === 'period' ? 'year' : $unit;
            if ($unit === 'month' && ((int) $student->angkatan === (int) $period->angkatan_maba || ! ($policy->settings['monthly_allowed'] ?? false))) {
                throw ValidationException::withMessages(['rate_unit' => 'Skema bulanan hanya untuk non-maba yang diizinkan kebijakan pengelola.']);
            }
            if (($data['funding'] ?? 'personal') !== 'personal') {
                throw ValidationException::withMessages(['funding' => 'Mahasiswa lokal memiliki kewajiban pembayaran pribadi.']);
            }
            $student->user->update(['client_profile_category' => $kipk ? 'local_kipk' : 'local_non_kipk']);
            $reservationHours = max(1, (int) ($policy->settings['reservation_hours'] ?? $period->reservation_hours ?? 168));
            if ($unit === 'day') {
                $tz = config('residence.timezone', 'Asia/Jakarta');
                $appTz = config('app.timezone', 'UTC');
                $hMinusOne = Carbon::parse($startsAt->toDateString().' 23:59:59', $tz)->subDay()->timezone($appTz);
                $expiresAt = $hMinusOne->isFuture()
                    ? $hMinusOne
                    : Carbon::parse($startsAt->toDateString().' 23:59:59', $tz)->timezone($appTz)->max(now()->addHours(2));
            } else {
                $expiresAt = $deadline ?? now()->addHours($reservationHours);
            }

            $billingBasis = $kipk ? 'person' : ($data['billing_basis'] ?? 'person');
            $inviteeNims = array_values(array_filter(array_map(
                fn (mixed $nim): string => trim((string) $nim),
                is_array($data['invitee_nims'] ?? null) ? $data['invitee_nims'] : [],
            ), fn (string $nim): bool => $nim !== ''));

            if ($billingBasis === 'group' && $inviteeNims === []) {
                throw ValidationException::withMessages(['invitee_nims' => 'Kategori Per Grup wajib mengundang minimal 1 teman sekamar.']);
            }

            $r = ResidenceRegistration::create([
                'workflow_version' => 2, 'residence_policy_id' => $policy->id,
                'student_profile_id' => $student->id, 'periode_id' => $period->id,
                'status' => 'submitted', 'is_kipk' => $kipk, 'submitted_at' => now(), 'notes' => $data['notes'] ?? null,
                'billing_basis' => $billingBasis,
                'starts_at' => $data['starts_at'] ?? $period->tanggal_mulai,
                'ends_at' => $data['ends_at'] ?? $period->tanggal_selesai,
                'rate_unit' => $unit, 'funding' => 'personal', 'allocation_status' => 'waiting',
                'reservation_expires_at' => $kipk ? null : $expiresAt,
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

            if ($inviteeNims !== []) {
                if ($kipk) {
                    throw ValidationException::withMessages(['invitee_nims' => 'Undangan teman sekamar hanya tersedia untuk mahasiswa non-KIP-K.']);
                }
                $r->refresh();
                $room = Kamar::query()->lockForUpdate()->findOrFail($r->reserved_room_id);
                $activeCount = $room->penempatanKamar()->where('status', 'aktif')->count();
                $heldCount = ResidenceRegistration::where('reserved_room_id', $room->id)
                    ->whereNull('completed_at')
                    ->whereNotIn('status', ['draft', 'rejected', 'cancelled'])
                    ->count();
                $remainingSlots = max(0, (int) $room->kapasitas - $activeCount - $heldCount);
                if (count($inviteeNims) > $remainingSlots) {
                    throw ValidationException::withMessages(['invitee_nims' => "Jumlah teman yang diundang melebihi sisa kapasitas kamar ({$remainingSlots} tempat tersisa)."]);
                }

                $invitations = app(RoomInvitationService::class);
                foreach ($inviteeNims as $index => $nim) {
                    $invitations->invite($r, $student->user, $nim, "invitee_nims.{$index}");
                }
                app(ResidenceWorkflow::class)->evaluate($r->fresh());
            }

            return $r->fresh(['roomPreferences', 'statusHistories']);
        }, 3);
    }
}
