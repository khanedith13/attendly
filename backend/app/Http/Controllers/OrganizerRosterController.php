<?php

namespace App\Http\Controllers;

use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\Registration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OrganizerRosterController extends Controller
{
    public function attendees(Request $request): JsonResponse
    {
        $organizer = $request->user()->organizer
            ?? abort(403, 'No organizer profile for this account.');

        $events = Event::withCounts()
            ->where('organizer_id', $organizer->id)
            ->where('status', 'published')
            ->orderByDesc('event_date')
            ->orderByDesc('start_time')
            ->get();

        $fallback = $events->first(fn (Event $event): bool => $event->starts_at->lte(now()))
            ?? $events->first();

        $event = $events->firstWhere('id', (int) $request->query('event_id')) ?? $fallback;

        if (! $event) {
            return response()->json([
                'events' => [],
                'event' => null,
                'rows' => [],
            ]);
        }

        $rows = Registration::query()
            ->with(['user', 'attendance'])
            ->where('event_id', $event->id)
            ->where('status', 'registered')
            ->orderByDesc('registered_at')
            ->get()
            ->map(fn (Registration $registration): array => [
                'id' => $registration->id,
                'eventId' => $registration->event_id,
                'name' => $registration->user->name,
                'studentId' => $registration->user->student_id ?? '',
                'email' => $registration->user->email,
                'course' => $registration->user->course ?? '',
                'yearLevel' => $registration->user->year_level ?? '',
                'registeredAt' => $registration->registered_at?->toIso8601String(),
                'status' => $registration->status,
                'timeIn' => $registration->attendance?->time_in?->toIso8601String(),
                'timeOut' => $registration->attendance?->time_out?->toIso8601String(),
                'selfieIn' => filled($registration->attendance?->selfie_in_path),
                'selfieOut' => filled($registration->attendance?->selfie_out_path),
            ]);

        return response()->json([
            'events' => $events->map(fn (Event $item): array => [
                'id' => $item->id,
                'title' => $item->title,
            ])->values(),
            'event' => (new EventResource($event))->resolve($request),
            'rows' => $rows->values(),
        ]);
    }

    public function selfie(
        Request $request,
        Registration $registration,
        string $direction
    ) {
        abort_unless(in_array($direction, ['in', 'out'], true), 404);

        $organizer = $request->user()->organizer
            ?? abort(403, 'No organizer profile for this account.');

        $registration->loadMissing('event', 'attendance');

        abort_unless(
            $registration->event->organizer_id === $organizer->id,
            403
        );

        $path = $direction === 'in'
            ? $registration->attendance?->selfie_in_path
            : $registration->attendance?->selfie_out_path;

        abort_unless(
            $path && Storage::disk('local')->exists($path),
            404
        );

        return response()->file(
            Storage::disk('local')->path($path)
        );
    }

    public function registrations(Request $request): JsonResponse
    {
        $organizer = $request->user()->organizer
            ?? abort(403, 'No organizer profile for this account.');

        $events = Event::query()
            ->where('organizer_id', $organizer->id)
            ->where('status', 'published')
            ->get()
            ->filter(fn (Event $event): bool => $event->ends_at->gte(now()))
            ->sortBy(fn (Event $event): int => $event->starts_at->timestamp)
            ->values();

        $eventTitles = $events->pluck('title', 'id');

        $rows = Registration::query()
            ->with('user')
            ->whereIn('event_id', $events->pluck('id'))
            ->where('status', 'registered')
            ->orderByDesc('registered_at')
            ->get()
            ->map(fn (Registration $registration): array => [
                'id' => $registration->id,
                'eventId' => $registration->event_id,
                'eventTitle' => $eventTitles[$registration->event_id],
                'name' => $registration->user->name,
                'studentId' => $registration->user->student_id ?? '',
                'email' => $registration->user->email,
                'course' => $registration->user->course ?? '',
                'yearLevel' => $registration->user->year_level ?? '',
                'registeredAt' => $registration->registered_at?->toIso8601String(),
                'status' => $registration->status,
            ]);

        return response()->json([
            'events' => $events->map(fn (Event $event): array => [
                'id' => $event->id,
                'title' => $event->title,
            ])->all(),
            'rows' => $rows->values(),
            'upcoming' => $events->count(),
        ]);
    }
}
