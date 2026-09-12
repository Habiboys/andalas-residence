<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'audit.view');

        return response()->json(
            AuditLog::with('user')->latest()->limit(200)->get()
        );
    }

    public function recent(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'audit.view');

        return response()->json(
            AuditLog::with('user')->latest()->limit(100)->get()
        );
    }
}
