<?php

namespace App\Actions\Registration;

use App\Enums\ResidenceRegistrationStatus;
use App\Models\MahasiswaProfil;
use App\Models\ResidenceRegistration;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmitResidenceRegistration
{
    public function __construct(private CreateResidenceBilling $createBilling) {}

    /**
     * @param array{
     *     periode_id: string,
     *     is_kipk: bool,
     *     notes?: string|null,
     *     preferences: list<array{kamar_id: string, notes?: string|null}>
     * } $data
     */
    public function handle(MahasiswaProfil $student, array $data): ResidenceRegistration
    {
        return DB::transaction(function () use ($student, $data): ResidenceRegistration {
            $student = MahasiswaProfil::query()->lockForUpdate()->findOrFail($student->id);
            if ($student->user->status !== 'aktif') {
                throw ValidationException::withMessages(['periode_id' => 'Akun tidak aktif. Hubungi admin layanan untuk mengaktifkan kembali sebelum mendaftar hunian.']);
            }
            if ($student->penempatanKamar()->where('status', 'aktif')->exists()) {
                throw ValidationException::withMessages(['periode_id' => 'Selesaikan masa hunian aktif sebelum mendaftar kembali.']);
            }
            $registration = ResidenceRegistration::query()
                ->where('student_profile_id', $student->id)
                ->where('periode_id', $data['periode_id'])
                ->lockForUpdate()
                ->first();

            if ($registration && ! in_array($registration->status, [ResidenceRegistrationStatus::Draft, ResidenceRegistrationStatus::Rejected], true)) {
                throw ValidationException::withMessages(['periode_id' => 'Pendaftaran untuk periode ini sudah diajukan.']);
            }

            $previousStatus = $registration?->status ?? ResidenceRegistrationStatus::Draft;
            if ($registration?->status === ResidenceRegistrationStatus::Rejected) {
                $registration->fill(['tagihan_id' => null, 'penempatan_kamar_id' => null, 'completed_at' => null, 'reviewed_at' => null, 'reviewed_by' => null]);
            }
            $registration ??= new ResidenceRegistration([
                'student_profile_id' => $student->id,
                'periode_id' => $data['periode_id'],
            ]);
            $registration->fill([
                'status' => ResidenceRegistrationStatus::Submitted,
                'is_kipk' => $data['is_kipk'],
                'submitted_at' => now(),
                'notes' => $data['notes'] ?? null,
            ])->save();

            $registration->roomPreferences()->delete();
            if (! $data['is_kipk']) {
                foreach ($data['preferences'] as $index => $preference) {
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

            return $registration->fresh(['roomPreferences', 'statusHistories']);
        });
    }
}
