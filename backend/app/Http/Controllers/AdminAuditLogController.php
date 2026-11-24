<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
            'category' => ['sometimes', 'string', 'in:all,logins,users,events,settings,failed'],
            'result' => ['sometimes', 'string', 'in:success,failed'],
        ]);

        $query = AuditLog::query();

        if (isset($filters['search']) && trim($filters['search']) !== '') {
            $search = '%'.trim($filters['search']).'%';

            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->where('actor_name', 'like', $search)
                    ->orWhere('action', 'like', $search)
                    ->orWhere('target', 'like', $search);
            });
        }

        $category = $filters['category'] ?? 'all';

        if ($category === 'failed' || ($filters['result'] ?? null) === 'failed') {
            $query->where('result', 'failed');
        } elseif (isset($filters['result'])) {
            $query->where('result', $filters['result']);
        }

        match ($category) {
            'logins' => $query->where(function (Builder $builder): void {
                $builder
                    ->where('action', 'like', '%login%')
                    ->orWhere('action', 'like', '%logged in%');
            }),
            'settings' => $query->where('action', 'like', '%setting%'),
            'events' => $query->where(function (Builder $builder): void {
                $builder
                    ->where('action', 'like', '%event%')
                    ->orWhere('action', 'like', '%flag%');
            }),
            'users' => $query->where(function (Builder $builder): void {
                $builder
                    ->where('action', 'not like', '%login%')
                    ->where('action', 'not like', '%logged in%')
                    ->where('action', 'not like', '%setting%')
                    ->where('action', 'not like', '%event%')
                    ->where('action', 'not like', '%flag%');
            }),
            default => null,
        };

        $entries = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(500)
            ->get();

        return response()->json([
            'data' => $entries->map(fn (AuditLog $entry): array => [
                'id' => $entry->id,
                'at' => $entry->created_at?->toIso8601String(),
                'actor' => $entry->actor_name,
                'role' => $entry->actor_role,
                'action' => $entry->action,
                'target' => $entry->target,
                'ip' => $entry->ip_address,
                'result' => $entry->result,
            ])->all(),
        ]);
    }
}