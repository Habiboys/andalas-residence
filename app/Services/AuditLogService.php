<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditLogService
{
    public static function log(
        ?User $user,
        string $event,
        Model $model,
        ?array $old = null,
        ?array $new = null,
        ?Request $request = null,
    ): AuditLog {
        return AuditLog::create([
            'user_id' => $user?->id,
            'event' => $event,
            'auditable_type' => $model::class,
            'auditable_id' => (string) $model->getKey(),
            'old_values' => $old,
            'new_values' => $new,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }
}
