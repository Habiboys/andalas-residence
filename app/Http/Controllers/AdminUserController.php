<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'users.manage');

        $users = User::role(['superadmin', 'pimpinan', 'staff_admin', 'fasilitator', 'teknisi'])
            ->with('roles')
            ->orderBy('nama')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'nim_nip' => $u->nim_nip,
                'nama' => $u->nama,
                'email' => $u->email,
                'no_hp' => $u->no_hp,
                'status' => $u->status,
                'roles' => $u->roles->pluck('name'),
            ]);

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'users.manage');

        $validated = $request->validate([
            'nim_nip' => 'required|string|max:50|unique:users,nim_nip',
            'nama' => 'required|string|max:150',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'no_hp' => 'nullable|string|max:20',
            'role' => 'required|string|in:superadmin,pimpinan,staff_admin,fasilitator,teknisi',
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

        return response()->json($user->load('roles'), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorizePermission($request, 'users.manage');

        $validated = $request->validate([
            'nim_nip' => 'sometimes|string|max:50|unique:users,nim_nip,'.$user->id,
            'nama' => 'sometimes|string|max:150',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'password' => 'nullable|string|min:8',
            'no_hp' => 'nullable|string|max:20',
            'status' => 'sometimes|in:aktif,nonaktif',
            'role' => 'sometimes|string|in:superadmin,pimpinan,staff_admin,fasilitator,teknisi',
        ]);

        $data = collect($validated)->except(['role', 'password'])->filter()->all();
        if (! empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }
        $user->update($data);

        if (! empty($validated['role'])) {
            $user->syncRoles([$validated['role']]);
        }

        return response()->json($user->fresh('roles'));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorizePermission($request, 'users.manage');
        abort_if($user->id === $request->user()->id, 422, 'Tidak dapat menghapus akun sendiri');

        $user->delete();

        return response()->json(['ok' => true]);
    }
}
