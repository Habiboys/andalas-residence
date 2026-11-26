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
        $category = (string) ($input['client_profile_category'] ?? '');
        $isNonStudent = $category === ClientProfileCategory::NonStudent->value;
        $isAsn = $category === ClientProfileCategory::Asn->value;
        $isExternalCampus = ! $isNonStudent && ! $isAsn && filter_var($input['is_external_campus'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $skipUnandAcademic = $isNonStudent || $isAsn || $isExternalCampus;
        $noNim = ! $isNonStudent && ! $isAsn && ! $isExternalCampus && filter_var($input['no_nim'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $emailRules = [
            'required',
            'string',
            'email',
            'max:255',
            Rule::unique('users', 'email'),
        ];
        if (! $isExternalCampus) {
            $emailRules[] = 'regex:/^[^@\s]+@((([a-z0-9-]+\.)*unand\.ac\.id)|(gmail\.com|googlemail\.com))$/i';
        }

        $validated = Validator::make($input, [
            'nama' => ['required', 'string', 'max:255'],
            'no_nim' => ['sometimes', 'boolean'],
            'is_external_campus' => ['sometimes', 'boolean'],
            'external_campus_name' => [Rule::requiredIf($isExternalCampus), Rule::excludeIf(! $isExternalCampus), 'string', 'max:150'],
            'external_program_name' => [Rule::requiredIf($isExternalCampus), Rule::excludeIf(! $isExternalCampus), 'string', 'max:150'],
            'unit_kerja' => [Rule::excludeIf(! $isAsn), 'nullable', 'string', 'max:150'],
            'nim_nip' => [
                Rule::requiredIf(! $noNim),
                Rule::excludeIf($noNim),
                'string',
                'max:50',
                Rule::unique('users', 'nim_nip'),
            ],
            'angkatan' => [
                Rule::requiredIf($noNim || $isExternalCampus),
                Rule::excludeIf(! $noNim && ! $isExternalCampus),
                'integer',
                'min:2000',
                'max:'.now()->year,
            ],
            'email' => $emailRules,
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'client_profile_category' => ['required', Rule::in([
                'local_student', 'local_kipk', 'local_non_kipk', 'international_student', 'international_free_facility', 'non_student', 'asn',
            ])],
            'faculty_id' => [Rule::requiredIf(! $skipUnandAcademic), Rule::excludeIf($skipUnandAcademic), 'uuid', 'exists:faculty,id'],
            'departemen_id' => [Rule::requiredIf(! $skipUnandAcademic), Rule::excludeIf($skipUnandAcademic), 'uuid', Rule::exists('departemen', 'id')->where('faculty_id', $input['faculty_id'] ?? null)],
            'prodi_id' => [Rule::requiredIf(! $skipUnandAcademic), Rule::excludeIf($skipUnandAcademic), 'uuid', Rule::exists('prodi', 'id')->where('departemen_id', $input['departemen_id'] ?? null)],
            'gender' => ['required', Rule::in(['laki_laki', 'perempuan'])],
            'no_hp' => ['nullable', 'string', 'max:20'],
        ], [
            'email.regex' => 'Email pendaftaran wajib menggunakan domain @unand.ac.id atau akun Google (@gmail.com).',
        ])->validate();

        if ($noNim) {
            do {
                $pendingNim = User::PENDING_NIM_PREFIX.strtoupper(Str::random(10));
            } while (User::where('nim_nip', $pendingNim)->exists());

            $validated['nim_nip'] = $pendingNim;
            $validated['angkatan'] = (string) $validated['angkatan'];
        } elseif ($isExternalCampus) {
            $validated['angkatan'] = (string) $validated['angkatan'];
        } else {
            $validated['angkatan'] = ($isNonStudent || $isAsn) ? null : StudentCohort::fromNim($validated['nim_nip']);
        }

        if ($validated['client_profile_category'] === 'international_free_facility') {
            $validated['client_profile_category'] = 'international_student';
        }
        if (in_array($validated['client_profile_category'], ['local_student', 'local_kipk', 'local_non_kipk'], true)) {
            $isKipk = ! $noNim
                && ! $isExternalCampus
                && KipkRecipient::where('nim', $validated['nim_nip'])->where('angkatan', $validated['angkatan'])->exists()
                && (int) Periode::where('status', 'aktif')->value('angkatan_maba') === (int) $validated['angkatan']
                && ! LegacyResident::where('nim', $validated['nim_nip'])->exists()
                && ! in_array(Prodi::whereKey($validated['prodi_id'])->value('jenjang'), ['S2', 'S3'], true);
            $validated['client_profile_category'] = $isKipk ? 'local_kipk' : 'local_non_kipk';
        }

        return DB::transaction(function () use ($validated, $isExternalCampus, $isAsn): User {
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
                'is_external_campus' => $isExternalCampus,
                'external_campus_name' => $isExternalCampus ? trim((string) ($validated['external_campus_name'] ?? '')) : null,
                'external_program_name' => $isExternalCampus ? trim((string) ($validated['external_program_name'] ?? '')) : null,
                'unit_kerja' => $isAsn && filled($validated['unit_kerja'] ?? null) ? trim((string) $validated['unit_kerja']) : null,
                'email_pribadi' => $validated['email'],
                'barcode_code' => 'BC-'.Str::uuid(),
                'status_huni' => 'calon',
            ]);

            return $user;
        });
    }
}
