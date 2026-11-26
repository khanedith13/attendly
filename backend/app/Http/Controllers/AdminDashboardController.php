<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Event;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    public function show(): JsonResponse
    {
        $roles = collect(['student', 'organizer', 'admin'])
            ->map(fn (string $role): array => [
                'role' => $role,
                'active' => User::query()
                    ->where('role', $role)
                    ->where('status', 'active')
                    ->count(),
                'pending' => User::query()
                    ->where('role', $role)
                    ->where('status', 'pending')
                    ->count(),
            ]);

        $activity = AuditLog::query()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn (AuditLog $entry): array => [
                'id' => $entry->id,
                'at' => $entry->created_at?->toIso8601String(),
                'actor' => $entry->actor_name,
                'role' => $entry->actor_role,
                'action' => $entry->action,
                'target' => $entry->target,
                'result' => $entry->result,
            ]);

        $today = now()->toDateString();
        $currentTime = now()->format('H:i:s');

        return response()->json([
            'stats' => [
                'users' => User::query()->count(),
                'organizers' => User::query()->where('role', 'organizer')->count(),
                'activeEvents' => Event::query()
                    ->where('status', 'published')
                    ->where('review_status', 'approved')
                    ->where(function ($query) use ($today, $currentTime): void {
                        $query
                            ->whereDate('event_date', '>', $today)
                            ->orWhere(function ($todayQuery) use ($today, $currentTime): void {
                                $todayQuery
                                    ->whereDate('event_date', $today)
                                    ->where('end_time', '>=', $currentTime);
                            });
                    })
                    ->count(),
                'uptime' => null,
            ],
            'review' => [
                'organizers' => User::query()
                    ->where('role', 'organizer')
                    ->where('status', 'pending')
                    ->count(),
                'events' => Event::query()
                    ->where('status', 'published')
                    ->where('review_status', 'pending')
                    ->count(),
                'flagged' => Event::query()
                    ->where('review_status', 'flagged')
                    ->count(),
            ],
            'roles' => $roles->values(),
            'activity' => $activity->values(),
        ]);
    }
}