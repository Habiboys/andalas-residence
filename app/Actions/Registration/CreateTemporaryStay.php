<?php

namespace App\Actions\Registration;

use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\ResidenceRegistration;
use App\Models\User;
use App\Services\ResidenceLifecycle;
use App\Services\ResidencePolicyService;
use App\Services\ResidenceWorkflowAccess;
use App\Services\StudentCohort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateTemporaryStay
{
    /**
     * Hunian sementara (Summer Course & non-mahasiswa) tidak punya akun aplikasi.
     * Identitas tetap disimpan sebagai User agar relasi penempatan & tagihan tetap utuh,
     * tetapi role-nya non-login sehingga tidak masuk rekap mahasiswa.
     */
    public const OCCUPANT_ROLE = 'tamu';

    /** @param array<string, mixed> $data */
    public function handle(array $data, User $officer): ResidenceRegistration
    {
        return DB::transaction(function () use ($data, $officer): ResidenceRegistration {
            abort_unless(ResidenceWorkflowAccess::manager($officer), 403);
            $period = Periode::where('status', 'aktif')->lockForUpdate()->first();
            if (! $period) {
                throw ValidationException::withMessages(['periode' => 'Admin harus mengaktifkan periode penerimaan terlebih dahulu.']);
            }
            $user = User::where('nim_nip', $data['nim_nip'])->lockForUpdate()->first();
            if ($user) {
                $isLoginable = $user->hasRole('mahasiswa') || $user->hasRole(self::OCCUPANT_ROLE);
                if (! $isLoginable || ! $user->mahasiswaProfil || $user->status !== 'aktif') {
                    throw ValidationException::withMessages(['nim_nip' => 'Identitas sudah digunakan akun yang tidak dapat didaftarkan.']);
                }
                if ((! empty($data['email']) && $user->email !== $data['email']) || $user->nama !== $data['nama'] || $user->gender !== $data['gender']) {
                    throw ValidationException::withMessages(['nim_nip' => 'Identitas sudah terdaftar. Gunakan data akun yang sesuai atau minta admin memperbaikinya.']);
                }
                $student = $user->mahasiswaProfil;
                if (($data['client_profile_category'] ?? '') === 'local_non_kipk' && (! in_array($student->prodi?->jenjang, ['S2', 'S3'], true) || $student->prodi_id !== ($data['prodi_id'] ?? null))) {
                    throw ValidationException::withMessages(['prodi_id' => 'Program studi harus sesuai profil S2/S3 yang terdaftar.']);
                }
                if ($data['stay_kind'] === 'regular' && app(ResidenceLifecycle::class)->isLocal($student)) {
                    throw ValidationException::withMessages(['nim_nip' => 'Akun lokal S1 menggunakan jalur pendaftaran mahasiswa.']);
                }
                MahasiswaProfil::whereKey($student->id)->lockForUpdate()->firstOrFail();
                if ($student->penempatanKamar()->where('status', 'aktif')->exists()
                    || $student->residenceRegistrations()->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected'])->exists()) {
                    throw ValidationException::withMessages(['nim_nip' => 'Penghuni masih mempunyai hunian atau pendaftaran berjalan.']);
                }
            } else {
                if (! empty($data['email']) && User::where('email', $data['email'])->exists()) {
                    throw ValidationException::withMessages(['email' => 'Email sudah digunakan oleh identitas lain.']);
                }
                $user = User::create([
                    'nama' => $data['nama'], 'nim_nip' => $data['nim_nip'], 'email' => $data['email'] ?? ('guest-'.Str::uuid().'@guest.invalid'),
                    'password' => Str::password(32), 'gender' => $data['gender'],
                    'status' => 'aktif', 'client_profile_category' => $data['client_profile_category'],
                ]);
                $user->assignRole(($data['stay_kind'] ?? '') === 'regular' ? 'mahasiswa' : self::OCCUPANT_ROLE);
                $student = MahasiswaProfil::create([
                    'user_id' => $user->id, 'barcode_code' => 'BC-'.Str::uuid(), 'status_huni' => 'calon',
                    'prodi_id' => $data['prodi_id'] ?? null,
                    'angkatan' => preg_match('/^\d{10}$/', $data['nim_nip']) ? StudentCohort::fromNim($data['nim_nip']) : null,
                ]);
            }
            if ($data['stay_kind'] !== 'non_student' && empty($data['residence_application_id'])) {
                throw ValidationException::withMessages(['application' => 'Permohonan institusi atau kegiatan wajib dicatat terlebih dahulu.']);
            }
            $policy = app(ResidencePolicyService::class)->current($data['stay_kind'] === 'regular' ? 'international' : $data['stay_kind']);
            $registration = ResidenceRegistration::create([
                'workflow_version' => 2, 'residence_policy_id' => $policy->id, 'allocation_status' => 'waiting',
                'residence_application_id' => $data['residence_application_id'] ?? null,
                'student_profile_id' => $student->id, 'periode_id' => $period->id,
                'stay_kind' => $data['stay_kind'], 'status' => 'accepted', 'is_kipk' => false,
                'submitted_at' => now(), 'reviewed_at' => now(), 'reviewed_by' => $officer->id,
                'starts_at' => $data['starts_at'], 'ends_at' => $data['ends_at'],
                'sponsor_limit' => $data['sponsor_limit'] ?? null,
                'rate_unit' => $data['rate_unit'] ?? 'day', 'funding' => $data['funding'] ?? 'personal', 'sponsor_name' => $data['sponsor_name'] ?? null,
            ]);
            $registration->roomPreferences()->create(['kamar_id' => $data['kamar_id'], 'priority' => 1]);
            app(AllocateResidenceRoom::class)->handle($registration, $data['kamar_id']);
            $registration->statusHistories()->create(['to_status' => 'accepted', 'changed_by' => $officer->id]);

            return $registration;
        });
    }
}
