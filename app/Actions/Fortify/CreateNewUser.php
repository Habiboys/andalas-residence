<?php

namespace App\Actions\Fortify;

use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    public function create(array $input): User
    {
        Validator::make($input, [
            'nama' => ['required', 'string', 'max:255'],
            'nim_nip' => ['required', 'string', 'max:50', Rule::unique('users', 'nim_nip')],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'prodi' => ['required', 'string', 'max:255'],
            'angkatan' => ['required', 'string', 'max:4'],
            'no_hp' => ['nullable', 'string', 'max:20'],
        ])->validate();

        $prodi = Prodi::query()
            ->where('name', 'like', '%'.$input['prodi'].'%')
            ->first();

        if (! $prodi) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'prodi' => ['Program studi tidak ditemukan. Gunakan nama seperti: Informatika'],
            ]);
        }

        $periode = Periode::query()->where('status', 'aktif')->firstOrFail();

        $user = User::create([
            'nim_nip' => $input['nim_nip'],
            'nama' => $input['nama'],
            'email' => $input['email'],
            'password' => Hash::make($input['password']),
            'no_hp' => $input['no_hp'] ?? null,
            'gender' => $input['gender'] ?? 'laki_laki',
            'status' => 'aktif',
            'email_verified_at' => now(),
        ]);

        $user->assignRole('mahasiswa');

        MahasiswaProfil::create([
            'user_id' => $user->id,
            'prodi_id' => $prodi->id,
            'periode_id' => $periode->id,
            'angkatan' => $input['angkatan'],
            'barcode_code' => 'BC-'.$input['nim_nip'],
            'status_huni' => 'calon',
        ]);

        return $user;
    }
}
