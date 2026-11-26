<?php

namespace App\Http\Controllers;

use App\Models\AttendanceSession;
use App\Models\FasilitatorWilayah;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminUserController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $canManageAll = $this->canManageAllUsers($request);
        $canManageFacilitator = $request->user()?->hasRole('staff_admin') ?? false;
        abort_unless($canManageAll || $canManageFacilitator, 403);

        $validated = $request->validate([
            'nim_nip' => 'required|string|max:50|unique:users,nim_nip',
            'nama' => 'required|string|max:150',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'no_hp' => 'nullable|string|max:20',
            'role' => $canManageAll
                ? 'required|string|in:superadmin,pimpinan,admin_layanan,admin_aset,staff_admin,fasilitator,teknisi,go'
                : 'required|string|in:fasilitator',
            'gedung_id' => 'nullable|uuid|exists:gedung,id',
        ]);

        $user = DB::transaction(function () use ($validated, $request): User {
            $user = User::create([
                'nim_nip' => $validated['nim_nip'],
                'nama' => $validated['nama'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'no_hp' => $validated['no_hp'] ?? null,
                'status' => 'aktif',
            ]);
            $user->syncRoles([$validated['role']]);

            if (in_array($validated['role'], ['fasilitator', 'go'], true) && ! empty($validated['gedung_id'])) {
                FasilitatorWilayah::updateOrCreate(
                    ['user_id' => $user->id],
                    ['gedung_id' => $validated['gedung_id']]
                );
            }

            AuditLogService::log($request->user(), 'create_user', $user, null, $user->toArray(), $request);

            return $user;
        });

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Akun internal {$user->nama} berhasil dibuat.",
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $canManageAll = $this->canManageAllUsers($request);
        $canManageFacilitator = ($request->user()?->hasRole('staff_admin') ?? false) && $user->hasRole('fasilitator');
        abort_unless($canManageAll || $canManageFacilitator, 403);

        $validated = $request->validate([
            'nim_nip' => 'sometimes|string|max:50|unique:users,nim_nip,'.$user->id,
            'nama' => 'sometimes|string|max:150',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'password' => 'nullable|string|min:8',
            'no_hp' => 'nullable|string|max:20',
            'status' => 'sometimes|in:aktif,nonaktif',
            'role' => $canManageAll
                ? 'sometimes|string|in:superadmin,pimpinan,admin_layanan,admin_aset,staff_admin,fasilitator,teknisi,go'
                : 'sometimes|string|in:fasilitator',
            'gedung_id' => 'nullable|uuid|exists:gedung,id',
        ]);

        DB::transaction(function () use ($validated, $user): void {
            $data = array_filter(array_diff_key($validated, array_flip(['role', 'password', 'gedung_id'])));
            if (! empty($validated['password'])) {
                $data['password'] = Hash::make($validated['password']);
            }
            if (isset($validated['status'])) {
                $data['inactive_reason'] = $validated['status'] === 'nonaktif' ? 'admin_blocked' : null;
            }
            $user->update($data);

            $effectiveRole = $validated['role'] ?? $user->roles()->value('name');
            if (! empty($validated['role'])) {
                $user->syncRoles([$validated['role']]);
            }

            if (in_array($effectiveRole, ['fasilitator', 'go'], true)) {
                if (array_key_exists('gedung_id', $validated)) {
                    $existing = FasilitatorWilayah::where('user_id', $user->id)->first();
                    if (! empty($validated['gedung_id'])) {
                        if ($existing && $existing->gedung_id !== $validated['gedung_id']) {
                            AttendanceSession::where('facilitator_id', $user->id)->whereNull('closed_at')->update(['closed_at' => now()]);
                        }
                        FasilitatorWilayah::updateOrCreate(
                            ['user_id' => $user->id],
                            ['gedung_id' => $validated['gedung_id']]
                        );
                    } elseif ($existing) {
                        AttendanceSession::where('facilitator_id', $user->id)->whereNull('closed_at')->update(['closed_at' => now()]);
                        $existing->delete();
                    }
                }
            } else {
                $existing = FasilitatorWilayah::where('user_id', $user->id)->first();
                if ($existing) {
                    AttendanceSession::where('facilitator_id', $user->id)->whereNull('closed_at')->update(['closed_at' => now()]);
                    $existing->delete();
                }
            }
        });

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Akun internal {$user->nama} diperbarui.",
        ]);
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $canManageAll = $this->canManageAllUsers($request);
        $canManageFacilitator = ($request->user()?->hasRole('staff_admin') ?? false) && $user->hasRole('fasilitator');
        abort_unless($canManageAll || $canManageFacilitator, 403);
        abort_if($user->id === $request->user()->id, 422, 'Tidak dapat menghapus akun sendiri');

        $user->delete();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Akun internal dihapus.',
        ]);
    }

    private function canManageAllUsers(Request $request): bool
    {
        $user = $request->user();

        return $user !== null && ($user->hasRole('superadmin') || $user->can('users.manage'));
    }
}
