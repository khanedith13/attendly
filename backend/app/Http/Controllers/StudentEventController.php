<?php

namespace App\Http\Controllers;

use App\Http\Resources\EventResource;
use App\Models\Event;
use Illuminate\Http\Request;

class StudentEventController extends Controller
{
    public function index(Request $request)
    {
        $mine = $request->user()
            ->registrations()
            ->pluck('status', 'event_id');

        $events = Event::withCounts()
            ->openToStudents()
            ->where('event_date', '>=', now()->toDateString())
            ->orderBy('event_date')
            ->orderBy('start_time')
            ->get()
            ->filter(fn (Event $event) => $event->ends_at->isFuture());

        return response()->json(
            $events->map(fn (Event $event) => [
                ...(new EventResource($event))->resolve($request),
                'myStatus' => $mine[$event->id] ?? null,
                'isFull' => $event->registered_count >= $event->capacity,
            ])->values()
        );
    }
}