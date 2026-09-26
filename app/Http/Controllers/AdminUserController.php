<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminUserController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'users.manage');

        $validated = $request->validate([
            'nim_nip' => 'required|string|max:50|unique:users,nim_nip',
            'nama' => 'required|string|max:150',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'no_hp' => 'nullable|string|max:20',
            'role' => 'required|string|in:superadmin,pimpinan,admin_layanan,admin_aset,staff_admin,fasilitator,teknisi,go',
        ]);

        $user = User::create([
            'nim_nip' => $validated['nim_nip'],
            'nama' => $validated['nama'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'no_hp' => $validated['no_hp'] ?? null,
            'status' => 'aktif',
        ]);
        $user->syncRoles([$validated['role']]);

        AuditLogService::log($request->user(), 'create_user', $user, null, $user->toArray(), $request);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Akun internal {$user->nama} berhasil dibuat.",
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $this->authorizePermission($request, 'users.manage');

        $validated = $request->validate([
            'nim_nip' => 'sometimes|string|max:50|unique:users,nim_nip,'.$user->id,
            'nama' => 'sometimes|string|max:150',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'password' => 'nullable|string|min:8',
            'no_hp' => 'nullable|string|max:20',
            'status' => 'sometimes|in:aktif,nonaktif',
            'role' => 'sometimes|string|in:superadmin,pimpinan,admin_layanan,admin_aset,staff_admin,fasilitator,teknisi,go',
        ]);

        $data = array_filter(array_diff_key($validated, array_flip(['role', 'password'])));
        if (! empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }
        if (isset($validated['status'])) {
            $data['inactive_reason'] = $validated['status'] === 'nonaktif' ? 'admin_blocked' : null;
        }
        $user->update($data);

        if (! empty($validated['role'])) {
            $user->syncRoles([$validated['role']]);
        }

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Akun internal {$user->nama} diperbarui.",
        ]);
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->authorizePermission($request, 'users.manage');
        abort_if($user->id === $request->user()->id, 422, 'Tidak dapat menghapus akun sendiri');

        $user->delete();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Akun internal dihapus.',
        ]);
    }
}
