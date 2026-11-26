<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateEventReviewRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;

class AdminEventController extends Controller
{
    public function index()
    {
        $events = Event::withCounts()
            ->where('status', '!=', 'draft')
            ->orderByDesc('event_date')
            ->orderByDesc('start_time')
            ->get();

        return EventResource::collection($events);
    }

    public function updateReview(
        UpdateEventReviewRequest $request,
        int $event,
        AuditLogger $audit
    ): JsonResponse|EventResource {
        $target = Event::withCounts()->findOrFail($event);

        if ($target->status === 'draft') {
            abort(404, 'Event not found.');
        }

        $data = $request->validated();

        if ($target->status === 'cancelled' && $data['status'] === 'flagged') {
            abort(409, 'Cancelled events cannot be flagged.');
        }

        $wasFlagged = $target->review_status === 'flagged';
        $target->review_status = $data['status'];
        $target->review_note = $data['status'] === 'flagged'
            ? trim($data['note'])
            : null;
        $target->save();

        $action = match (true) {
            $data['status'] === 'flagged' => 'Flagged event',
            $wasFlagged => 'Cleared event flag',
            default => 'Approved event',
        };

        $audit->record($request->user(), $action, $target->title);

        return new EventResource(
            $target->fresh()->load('organizer')->loadCount([
                'registrations as registered_count' => fn ($query) => $query
                    ->where('status', 'registered'),
                'attendances as checked_in_count' => fn ($query) => $query
                    ->where('registrations.status', 'registered')
                    ->whereNotNull('attendances.time_in'),
            ])
        );
    }
}