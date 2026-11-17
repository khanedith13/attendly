<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;

class AuditLogger
{
    public function record(
        ?User $actor,
        string $action,
        ?string $target = null,
        string $result = 'success',
        ?string $fallbackName = null
    ): void {
        AuditLog::create([
            'user_id' => $actor?->id,
            'actor_name' => $actor?->name ?? $fallbackName ?? 'Unknown',
            'actor_role' => $actor?->role,
            'action' => $action,
            'target' => $target,
            'result' => $result,
            'ip_address' => request()->ip(),
        ]);
    }
}