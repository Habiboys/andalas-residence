<?php

namespace App\Actions\Registration;

use App\Enums\ResidenceRegistrationStatus;
use App\Models\Kamar;
use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\ResidenceRegistration;
use App\Services\ResidenceLifecycle;
use App\Services\RoomEligibility;
use App\Services\RoomReservations;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmitResidenceRegistration
{
    public function __construct(private CreateResidenceBilling $createBilling) {}

    /**
     * @param  array{
     *     periode_id: string,
     *     is_kipk: bool,
     *     notes?: string|null,
     *     rate_unit?: string, starts_at?: string|null, ends_at?: string|null, funding?: string, sponsor_name?: string|null,
     *     preferences?: list<array{kamar_id: string, notes?: string|null}>
     * } $data
     */
    public function handle(MahasiswaProfil $student, array $data): ResidenceRegistration
    {
        return DB::transaction(function () use ($student, $data): ResidenceRegistration {
            $student = MahasiswaProfil::query()->lockForUpdate()->findOrFail($student->id);
            if ($student->user->status !== 'aktif' && $student->user->inactive_reason !== 'letter_issued') {
                throw ValidationException::withMessages(['periode_id' => 'Akun tidak aktif. Hubungi admin layanan untuk mengaktifkan kembali sebelum mendaftar hunian.']);
            }
            if ($student->penempatanKamar()->where('status', 'aktif')->exists()) {
                throw ValidationException::withMessages(['periode_id' => 'Selesaikan masa hunian aktif sebelum mendaftar kembali.']);
            }
            $data['is_kipk'] = app(ResidenceLifecycle::class)->isKipk($student);
            $preferences = $data['is_kipk'] ? [] : ($data['preferences'] ?? []);
            if (! $data['is_kipk']) {
                foreach ($preferences as $preference) {
                    $room = Kamar::query()->lockForUpdate()->findOrFail($preference['kamar_id']);
                    RoomEligibility::validate($room, $student->user, 'preferences');
                }
            }
            app(RoomReservations::class)->expire();
            if (ResidenceRegistration::where('student_profile_id', $student->id)->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected'])->exists()) {
                throw ValidationException::withMessages(['periode_id' => 'Selesaikan pendaftaran yang sedang berjalan terlebih dahulu.']);
            }
            $period = Periode::where('status', 'aktif')->findOrFail($data['periode_id']);
            $life = app(ResidenceLifecycle::class);
            $data['is_kipk'] = $life->isKipk($student);
            $funding = $data['is_kipk'] ? 'sponsor' : ($data['funding'] ?? 'personal');
            if ($funding === 'sponsor' && ! $data['is_kipk'] && $life->isLocal($student)) {
                throw ValidationException::withMessages(['funding' => 'Mahasiswa lokal non-KIP-K membayar secara pribadi.']);
            }
            if ($life->isLocal($student)) {
                $student->user->update(['client_profile_category' => $data['is_kipk'] ? 'local_kipk' : 'local_non_kipk']);
            }
            $previousStatus = ResidenceRegistrationStatus::Draft;
            $registration = new ResidenceRegistration(['student_profile_id' => $student->id, 'periode_id' => $period->id]);
            $registration->fill([
                'status' => ResidenceRegistrationStatus::Submitted,
                'is_kipk' => $data['is_kipk'],
                'submitted_at' => now(),
                'notes' => $data['notes'] ?? null,
                'reserved_room_id' => $data['is_kipk'] ? null : $preferences[0]['kamar_id'],
                'reservation_expires_at' => now()->addHours($period->reservation_hours),
                'starts_at' => $data['starts_at'] ?? $period->tanggal_mulai,
                'ends_at' => $data['ends_at'] ?? $period->tanggal_selesai,
                'rate_unit' => $data['rate_unit'] ?? 'period',
                'funding' => $funding,
                'sponsor_name' => $data['is_kipk'] ? 'KIP-K' : ($data['sponsor_name'] ?? null),
                'sponsor_approved_at' => $data['is_kipk'] ? now() : null,
            ])->save();

            $registration->roomPreferences()->delete();
            if (! $data['is_kipk']) {
                foreach ($preferences as $index => $preference) {
                    $registration->roomPreferences()->create([
                        'kamar_id' => $preference['kamar_id'],
                        'priority' => $index + 1,
                        'notes' => $preference['notes'] ?? null,
                    ]);
                }
            }

            $registration->statusHistories()->create([
                'from_status' => $previousStatus,
                'to_status' => ResidenceRegistrationStatus::Submitted,
                'changed_by' => $student->user_id,
            ]);
            $this->createBilling->handle($registration);
            app(CompleteResidenceRegistration::class)->handle($registration);

            return $registration->fresh(['roomPreferences', 'statusHistories']);
        });
    }
}
