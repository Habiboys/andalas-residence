<?php

namespace App\Actions\Registration;

use App\Enums\ResidenceRegistrationStatus;
use App\Models\MahasiswaProfil;
use App\Models\ResidenceRegistration;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmitResidenceRegistration
{
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
            $registration = ResidenceRegistration::query()
                ->where('student_profile_id', $student->id)
                ->where('periode_id', $data['periode_id'])
                ->lockForUpdate()
                ->first();

            if ($registration && $registration->status !== ResidenceRegistrationStatus::Draft) {
                throw ValidationException::withMessages(['periode_id' => 'Pendaftaran untuk periode ini sudah diajukan.']);
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
                'from_status' => ResidenceRegistrationStatus::Draft,
                'to_status' => ResidenceRegistrationStatus::Submitted,
                'changed_by' => $student->user_id,
            ]);

            return $registration->fresh(['roomPreferences', 'statusHistories']);
        });
    }
}
