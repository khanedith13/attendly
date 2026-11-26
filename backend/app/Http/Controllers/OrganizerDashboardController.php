<?php

namespace App\Http\Controllers;

use App\Http\Resources\EventResource;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizerDashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $organizer = $request->user()->organizer
            ?? abort(403, 'No organizer profile for this account.');

        $events = Event::withCounts()
            ->where('organizer_id', $organizer->id)
            ->where('status', 'published')
            ->get();

        $now = now();
        $started = $events
            ->filter(fn (Event $event): bool => $event->starts_at->lte($now));

        $registered = (int) $started->sum('registered_count');
        $checkedIn = (int) $started->sum('checked_in_count');

        $upcoming = $events
            ->filter(fn (Event $event): bool => $event->ends_at->gte($now))
            ->sortBy(fn (Event $event): int => $event->starts_at->timestamp)
            ->take(3)
            ->values();

        $recent = $started
            ->sortByDesc(fn (Event $event): int => $event->starts_at->timestamp)
            ->take(5)
            ->values();

        return response()->json([
            'stats' => [
                'published' => $events->count(),
                'registrations' => (int) $events->sum('registered_count'),
                'checkedIn' => (int) $events->sum('checked_in_count'),
                'showUpRate' => $registered > 0
                    ? (int) round(($checkedIn / $registered) * 100)
                    : 0,
            ],
            'performance' => $started->isNotEmpty() ? [
                'rate' => $registered > 0
                    ? (int) round(($checkedIn / $registered) * 100)
                    : 0,
                'checkedIn' => $checkedIn,
                'noShow' => max(0, $registered - $checkedIn),
                'registered' => $registered,
            ] : null,
            'upcoming' => $upcoming
                ->map(fn (Event $event): array => (new EventResource($event))->resolve($request))
                ->all(),
            'recent' => $recent
                ->map(fn (Event $event): array => (new EventResource($event))->resolve($request))
                ->all(),
        ]);
    }
}