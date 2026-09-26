<?php

namespace App\Actions\Fortify;

use App\Enums\ClientProfileCategory;
use App\Models\KipkRecipient;
use App\Models\LegacyResident;
use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\User;
use App\Services\StudentCohort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    /** @param array<string, mixed> $input */
    public function create(array $input): User
    {
        $isNonStudent = ($input['client_profile_category'] ?? null) === ClientProfileCategory::NonStudent->value;
        $validated = Validator::make($input, [
            'nama' => ['required', 'string', 'max:255'],
            'nim_nip' => ['required', 'string', 'max:50', Rule::unique('users', 'nim_nip')],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'client_profile_category' => ['required', Rule::in([
                'local_student', 'local_kipk', 'local_non_kipk', 'international_student', 'international_free_facility', 'non_student',
            ])],
            'faculty_id' => [Rule::requiredIf(! $isNonStudent), Rule::excludeIf($isNonStudent), 'uuid', 'exists:faculty,id'],
            'departemen_id' => [Rule::requiredIf(! $isNonStudent), Rule::excludeIf($isNonStudent), 'uuid', Rule::exists('departemen', 'id')->where('faculty_id', $input['faculty_id'] ?? null)],
            'prodi_id' => [Rule::requiredIf(! $isNonStudent), Rule::excludeIf($isNonStudent), 'uuid', Rule::exists('prodi', 'id')->where('departemen_id', $input['departemen_id'] ?? null)],
            'gender' => ['required', Rule::in(['laki_laki', 'perempuan'])],
            'no_hp' => ['nullable', 'string', 'max:20'],
        ])->validate();
        $validated['angkatan'] = $isNonStudent ? null : StudentCohort::fromNim($validated['nim_nip']);

        if ($validated['client_profile_category'] === 'international_free_facility') {
            $validated['client_profile_category'] = 'international_student';
        }
        if (in_array($validated['client_profile_category'], ['local_student', 'local_kipk', 'local_non_kipk'], true)) {
            $isKipk = KipkRecipient::where('nim', $validated['nim_nip'])->where('angkatan', $validated['angkatan'])->exists()
                && (int) Periode::where('status', 'aktif')->value('angkatan_maba') === (int) $validated['angkatan']
                && ! LegacyResident::where('nim', $validated['nim_nip'])->exists()
                && ! in_array(Prodi::whereKey($validated['prodi_id'])->value('jenjang'), ['S2', 'S3'], true);
            $validated['client_profile_category'] = $isKipk ? 'local_kipk' : 'local_non_kipk';
        }

        return DB::transaction(function () use ($validated): User {
            $user = User::create([
                'nim_nip' => $validated['nim_nip'],
                'nama' => $validated['nama'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'no_hp' => $validated['no_hp'] ?? null,
                'gender' => $validated['gender'],
                'client_profile_category' => $validated['client_profile_category'],
                'status' => 'aktif',
            ]);
            $user->assignRole('mahasiswa');
            MahasiswaProfil::create([
                'user_id' => $user->id,
                'prodi_id' => $validated['prodi_id'] ?? null,
                'angkatan' => $validated['angkatan'] ?? null,
                'barcode_code' => 'BC-'.Str::uuid(),
                'status_huni' => 'calon',
            ]);

            return $user;
        });
    }
}
