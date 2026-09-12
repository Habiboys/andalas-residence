<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PanelController extends Controller
{
    public function panel(Request $request, ?string $role = null, ?string $page = null): Response
    {
        $user = $request->user()?->load('roles', 'mahasiswaProfil.prodi', 'mahasiswaProfil.periode');

        $realRole = $user?->roles?->first()?->name;

        $validRoles = ['mahasiswa', 'fasilitator', 'staff_admin', 'superadmin', 'teknisi', 'pimpinan'];
        $role = in_array($role, $validRoles, true) ? $role : null;

        $allowedRoles = $realRole === 'superadmin' ? ['superadmin', 'staff_admin'] : ($realRole ? [$realRole] : ['staff_admin']);
        if ($role === null || ! in_array($role, $allowedRoles, true)) {
            $role = $realRole ?? 'staff_admin';
        }

        $page = is_string($page) ? (string) Str::of($page)->slug() : '';
        $page = $page !== '' ? $page : 'dashboard';

        if ($realRole !== 'superadmin' && $role === 'staff_admin' && $page === 'audit-log') {
            $page = 'dashboard';
        }

        return Inertia::render('andalas/panel', [
            'initialUser' => $user ? $this->formatUser($user) : null,
            'role' => $role,
            'page' => $page,
        ]);
    }

    private function formatUser(User $user): array
    {
        $role = $user->roles->first()?->name ?? 'mahasiswa';

        return [
            'id' => $user->id,
            'nim' => $user->nim_nip,
            'nama' => $user->nama,
            'email' => $user->email,
            'role' => $role,
            'raw_role' => $role,
            'no_hp' => $user->no_hp,
            'prodi' => $user->mahasiswaProfil?->prodi?->name,
            'angkatan' => $user->mahasiswaProfil?->angkatan,
            'barcode_code' => $user->mahasiswaProfil?->barcode_code,
            'status_huni' => $user->mahasiswaProfil?->status_huni,
        ];
    }
}
