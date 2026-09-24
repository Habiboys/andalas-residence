<?php

namespace App\Http\Controllers;

use App\Actions\Fortify\CreateNewUser;
use App\Models\MahasiswaProfil;
use App\Models\Tagihan;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MahasiswaController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'mahasiswa.create');

        $request->validate(['status_huni' => ['prohibited']]);
        $user = app(CreateNewUser::class)->create([
            ...$request->all(),
            'password_confirmation' => $request->input('password'),
        ]);
        $mhs = $user->mahasiswaProfil;
        $validated = ['nama' => $user->nama];

        AuditLogService::log($request->user(), 'create_mahasiswa', $mhs, null, $mhs->toArray(), $request);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Mahasiswa {$validated['nama']} berhasil ditambahkan.",
        ]);
    }

    public function update(Request $request, MahasiswaProfil $mahasiswa): RedirectResponse
    {
        $this->authorizePermission($request, 'mahasiswa.update');

        $validated = $request->validate([
            'nim_nip' => 'sometimes|string|max:50|unique:users,nim_nip,'.$mahasiswa->user_id,
            'nama' => 'sometimes|string|max:150',
            'email' => 'sometimes|email|unique:users,email,'.$mahasiswa->user_id,
            'password' => 'nullable|string|min:8',
            'no_hp' => 'nullable|string|max:20',
            'prodi_id' => 'nullable|uuid|exists:prodi,id',
            'periode_id' => 'prohibited',
            'client_profile_category' => ['sometimes', Rule::in(['student', 'local_kipk', 'local_non_kipk', 'local_resident', 'international_student', 'international_free_facility', 'non_student'])],
            'gender' => 'sometimes|in:laki_laki,perempuan',
            'angkatan' => 'nullable|integer|between:1900,'.now()->year,
            'status_huni' => 'prohibited',
        ]);

        DB::transaction(function () use ($validated, $mahasiswa) {
            $mahasiswa = MahasiswaProfil::query()->lockForUpdate()->findOrFail($mahasiswa->id);
            if (isset($validated['client_profile_category']) && $validated['client_profile_category'] !== $mahasiswa->user->client_profile_category?->value
                && $mahasiswa->residenceRegistrations()->whereIn('status', ['submitted', 'verified', 'accepted'])->exists()) {
                throw ValidationException::withMessages(['client_profile_category' => 'Kategori tidak dapat diubah saat pendaftaran sedang diproses atau sudah diterima.']);
            }
            $userData = collect($validated)->only(['nim_nip', 'nama', 'email', 'no_hp', 'client_profile_category', 'gender'])->filter()->all();
            if (! empty($validated['password'])) {
                $userData['password'] = Hash::make($validated['password']);
            }
            if ($userData) {
                $mahasiswa->user->update($userData);
            }

            $profilData = collect($validated)->only(['prodi_id', 'angkatan'])->filter()->all();
            if ($profilData) {
                $mahasiswa->update($profilData);
            }
        });

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Mahasiswa {$mahasiswa->user?->nama} diperbarui.",
        ]);
    }

    public function destroy(Request $request, MahasiswaProfil $mahasiswa): RedirectResponse
    {
        $this->authorizePermission($request, 'mahasiswa.delete');

        if ($mahasiswa->penempatanKamar()->exists() || $mahasiswa->residenceRegistrations()->exists()
            || $mahasiswa->pembayaran()->exists() || Tagihan::where('mahasiswa_id', $mahasiswa->id)->exists()) {
            throw ValidationException::withMessages(['mahasiswa' => 'Akun yang memiliki riwayat hunian atau tagihan tidak dapat dihapus.']);
        }

        DB::transaction(function () use ($mahasiswa) {
            $user = $mahasiswa->user;
            $mahasiswa->delete();
            $user?->delete();
        });

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Mahasiswa dihapus.',
        ]);
    }
}
