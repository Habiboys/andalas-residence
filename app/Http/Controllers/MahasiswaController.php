<?php

namespace App\Http\Controllers;

use App\Models\MahasiswaProfil;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MahasiswaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'mahasiswa.view');

        return response()->json(
            MahasiswaProfil::with(['user', 'prodi', 'periode', 'penempatanKamar.kamar.lantai.gedung'])->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'mahasiswa.create');

        $validated = $request->validate([
            'nim_nip' => 'required|string|max:50|unique:users,nim_nip',
            'nama' => 'required|string|max:150',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'no_hp' => 'nullable|string|max:20',
            'prodi_id' => 'required|uuid|exists:prodi,id',
            'periode_id' => 'required|uuid|exists:periode,id',
            'angkatan' => 'required|string|max:10',
            'status_huni' => 'nullable|in:calon,aktif,nonaktif,keluar',
        ]);

        $mhs = DB::transaction(function () use ($validated) {
            $user = User::create([
                'nim_nip' => $validated['nim_nip'],
                'nama' => $validated['nama'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'no_hp' => $validated['no_hp'] ?? null,
                'status' => 'aktif',
            ]);
            $user->assignRole('mahasiswa');

            return MahasiswaProfil::create([
                'user_id' => $user->id,
                'prodi_id' => $validated['prodi_id'],
                'periode_id' => $validated['periode_id'],
                'angkatan' => $validated['angkatan'],
                'barcode_code' => 'BC-'.strtoupper(Str::random(10)),
                'status_huni' => $validated['status_huni'] ?? 'calon',
            ]);
        });

        AuditLogService::log($request->user(), 'create_mahasiswa', $mhs, null, $mhs->toArray(), $request);

        return response()->json($mhs->load(['user', 'prodi', 'periode']), 201);
    }

    public function update(Request $request, MahasiswaProfil $mahasiswa): JsonResponse
    {
        $this->authorizePermission($request, 'mahasiswa.update');

        $validated = $request->validate([
            'nim_nip' => 'sometimes|string|max:50|unique:users,nim_nip,'.$mahasiswa->user_id,
            'nama' => 'sometimes|string|max:150',
            'email' => 'sometimes|email|unique:users,email,'.$mahasiswa->user_id,
            'password' => 'nullable|string|min:8',
            'no_hp' => 'nullable|string|max:20',
            'prodi_id' => 'sometimes|uuid|exists:prodi,id',
            'periode_id' => 'sometimes|uuid|exists:periode,id',
            'angkatan' => 'sometimes|string|max:10',
            'status_huni' => 'sometimes|in:calon,aktif,nonaktif,keluar',
        ]);

        DB::transaction(function () use ($validated, $mahasiswa) {
            $userData = collect($validated)->only(['nim_nip', 'nama', 'email', 'no_hp'])->filter()->all();
            if (! empty($validated['password'])) {
                $userData['password'] = Hash::make($validated['password']);
            }
            if ($userData) {
                $mahasiswa->user->update($userData);
            }

            $profilData = collect($validated)->only(['prodi_id', 'periode_id', 'angkatan', 'status_huni'])->filter()->all();
            if ($profilData) {
                $mahasiswa->update($profilData);
            }
        });

        return response()->json($mahasiswa->fresh(['user', 'prodi', 'periode']));
    }

    public function destroy(Request $request, MahasiswaProfil $mahasiswa): JsonResponse
    {
        $this->authorizePermission($request, 'mahasiswa.delete');

        DB::transaction(function () use ($mahasiswa) {
            $user = $mahasiswa->user;
            $mahasiswa->delete();
            $user?->delete();
        });

        return response()->json(['ok' => true]);
    }
}
