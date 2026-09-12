<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * Abort unless user has the given permission.
     */
    protected function authorizePermission(Request $request, string $permission): void
    {
        abort_unless($request->user()?->can($permission), 403);
    }

    /**
     * Abort unless user has any of the given permissions.
     */
    protected function authorizeAnyPermission(Request $request, array $permissions): void
    {
        abort_unless($request->user()?->hasAnyPermission($permissions), 403);
    }

    /**
     * Abort unless user has all of the given permissions.
     */
    protected function authorizeAllPermissions(Request $request, array $permissions): void
    {
        foreach ($permissions as $permission) {
            abort_unless($request->user()?->can($permission), 403);
        }
    }

    /**
     * Abort unless user is a superadmin (role-level guard for managing the
     * permission system itself, users, and audit logs).
     */
    protected function authorizeSuperadmin(Request $request): void
    {
        abort_unless($request->user()?->hasRole('superadmin'), 403);
    }

    /**
     * Legacy role-based guard kept for compatibility.
     */
    protected function authorizeRole(Request $request, array $roles): void
    {
        abort_unless($request->user()?->hasAnyRole($roles), 403);
    }
}
