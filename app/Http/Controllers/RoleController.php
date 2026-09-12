<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeSuperadmin($request);

        $roles = Role::where('guard_name', 'web')
            ->whereNotIn('name', ['mahasiswa'])
            ->orderBy('name')
            ->get()
            ->map(fn (Role $r) => [
                'name' => $r->name,
                'users_count' => User::role($r->name)->count(),
            ]);

        return response()->json($roles);
    }
}
