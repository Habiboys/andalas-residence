<?php

namespace App\Actions\Fortify;

use App\Enums\ClientProfileCategory;
use App\Models\MahasiswaProfil;
use App\Models\User;
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
                'local_kipk', 'local_non_kipk', 'local_resident', 'international_student', 'international_free_facility', 'non_student',
            ])],
            'prodi_id' => ['nullable', 'uuid', Rule::exists('prodi', 'id')],
            'angkatan' => [Rule::requiredIf(! $isNonStudent), Rule::excludeIf($isNonStudent), 'integer', 'between:1900,'.now()->year],
            'gender' => ['required', Rule::in(['laki_laki', 'perempuan'])],
            'no_hp' => ['nullable', 'string', 'max:20'],
        ])->validate();

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
