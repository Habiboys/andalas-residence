<?php

namespace App\Actions\Registration;

use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\ResidenceRegistration;
use App\Models\User;
use App\Services\StudentCohort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateTemporaryStay
{
    /** @param array<string, mixed> $data */
    public function handle(array $data, User $officer): ResidenceRegistration
    {
        return DB::transaction(function () use ($data, $officer): ResidenceRegistration {
            $period = Periode::where('status', 'aktif')->lockForUpdate()->first();
            if (! $period) {
                throw ValidationException::withMessages(['periode' => 'Admin harus mengaktifkan periode penerimaan terlebih dahulu.']);
            }
            $user = User::where('nim_nip', $data['nim_nip'])->lockForUpdate()->first();
            if ($user) {
                if (! $user->hasRole('mahasiswa') || ! $user->mahasiswaProfil || $user->status !== 'aktif') {
                    throw ValidationException::withMessages(['nim_nip' => 'Identitas sudah digunakan akun yang tidak dapat didaftarkan.']);
                }
                if ($user->email !== $data['email'] || $user->nama !== $data['nama'] || $user->gender !== $data['gender']
                    || $user->client_profile_category?->value !== $data['client_profile_category']) {
                    throw ValidationException::withMessages(['nim_nip' => 'Identitas sudah terdaftar. Gunakan data akun yang sesuai atau minta admin memperbaikinya.']);
                }
                $student = $user->mahasiswaProfil;
                MahasiswaProfil::whereKey($student->id)->lockForUpdate()->firstOrFail();
                if ($student->penempatanKamar()->where('status', 'aktif')->exists()
                    || $student->residenceRegistrations()->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected'])->exists()) {
                    throw ValidationException::withMessages(['nim_nip' => 'Penghuni masih mempunyai hunian atau pendaftaran berjalan.']);
                }
            } else {
                if (User::where('email', $data['email'])->exists()) {
                    throw ValidationException::withMessages(['email' => 'Email sudah digunakan oleh identitas lain.']);
                }
                $user = User::create([
                    'nama' => $data['nama'], 'nim_nip' => $data['nim_nip'], 'email' => $data['email'],
                    'password' => Str::password(32), 'gender' => $data['gender'],
                    'status' => 'aktif', 'client_profile_category' => $data['client_profile_category'],
                ]);
                $user->assignRole('mahasiswa');
                $student = MahasiswaProfil::create([
                    'user_id' => $user->id, 'barcode_code' => 'BC-'.Str::uuid(), 'status_huni' => 'calon',
                    'angkatan' => $data['client_profile_category'] === 'non_student' ? null : StudentCohort::fromNim($data['nim_nip']),
                ]);
            }
            $registration = ResidenceRegistration::create([
                'student_profile_id' => $student->id, 'periode_id' => $period->id,
                'stay_kind' => $data['stay_kind'], 'status' => 'accepted', 'is_kipk' => false,
                'submitted_at' => now(), 'reviewed_at' => now(), 'reviewed_by' => $officer->id,
                'starts_at' => $data['starts_at'], 'ends_at' => $data['ends_at'],
                'rate_unit' => 'day', 'funding' => 'personal', 'reserved_room_id' => $data['kamar_id'],
            ]);
            $registration->roomPreferences()->create(['kamar_id' => $data['kamar_id'], 'priority' => 1]);
            app(CreateResidenceBilling::class)->handle($registration);
            $placement = app(PlaceResidenceRegistration::class)->handle($registration, $data['kamar_id'], $officer->id);
            $placement->update(['tanggal_selesai' => $data['ends_at']]);
            $registration->update(['penempatan_kamar_id' => $placement->id, 'completed_at' => now()]);
            $student->update(['status_huni' => 'aktif', 'tanggal_masuk' => $student->tanggal_masuk ?? $data['starts_at']]);
            $student->residenceHistories()->create(['event' => 'entered', 'occurred_at' => now()]);
            $registration->statusHistories()->create(['to_status' => 'accepted', 'changed_by' => $officer->id]);

            return $registration;
        });
    }
}
