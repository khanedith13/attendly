<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveEventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\SettingsService;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;

class OrganizerEventController extends Controller
{
    private function ownEvents(Request $request): Builder
    {
        $organizer = $request->user()->organizer
            ?? abort(403, 'No organizer profile for this account.');

        return Event::withCounts()
            ->where('organizer_id', $organizer->id);
    }

    private function ownEvent(Request $request, int $id): Event
    {
        return $this->ownEvents($request)->findOrFail($id);
    }

    private function assertCanPublish(User $user): void
    {
        if ($user->status === 'pending') {
            abort(
                403,
                'Your organizer account is awaiting approval. You can save drafts, but you cannot publish yet.'
            );
        }

        if ($user->status !== 'active') {
            abort(403, 'Your organizer account is not active.');
        }
    }

    private function reviewForPublish(): string
    {
        return app(SettingsService::class)->bool('require_event_approval')
            ? 'pending'
            : 'approved';
    }

    private function eventAttributes(array $data): array
    {
        return [
            'title' => trim($data['title']),
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'venue' => trim($data['venue']),
            'event_date' => $data['date'],
            'start_time' => $data['startTime'],
            'end_time' => $data['endTime'],
            'capacity' => (int) $data['capacity'],
            'require_school_gmail' => $data['requireSchoolGmail'] ?? true,
            'send_confirmation_email' => $data['sendConfirmation'] ?? true,
        ];
    }

    public function index(Request $request)
    {
        $events = $this->ownEvents($request)
            ->orderByDesc('event_date')
            ->orderByDesc('start_time')
            ->get();

        return EventResource::collection($events);
    }

    public function show(Request $request, int $event)
    {
        return new EventResource($this->ownEvent($request, $event));
    }

    public function store(
        SaveEventRequest $request,
        AuditLogger $audit
    ) {
        $data = $request->validated();
        $publish = $request->boolean('publish');

        if ($publish) {
            $this->assertCanPublish($request->user());
        }

        $organizer = $request->user()->organizer
            ?? abort(403, 'No organizer profile for this account.');

        $event = new Event($this->eventAttributes($data));
        $event->organizer_id = $organizer->id;
        $event->status = $publish ? 'published' : 'draft';
        $event->review_status = $publish
            ? $this->reviewForPublish()
            : 'approved';
        $event->qr_in_token = $data['qrIn'] ?? (string) \Illuminate\Support\Str::uuid();
        $event->qr_out_token = $data['qrOut'] ?? (string) \Illuminate\Support\Str::uuid();
        $event->save();

        $audit->record(
            $request->user(),
            $publish ? 'Published event' : 'Created draft event',
            $event->title
        );

        return (new EventResource($event->load('organizer')))
            ->response()
            ->setStatusCode(201);
    }

    public function update(
        SaveEventRequest $request,
        int $event,
        AuditLogger $audit
    ) {
        $event = $this->ownEvent($request, $event);

        if (
            $event->status === 'cancelled'
            || $event->ends_at->isPast()
        ) {
            abort(409, 'This event can no longer be edited.');
        }

        $data = $request->validated();
        $publish = $request->boolean('publish');
        $publishingDraft = $publish && $event->status === 'draft';

        if ($publishingDraft) {
            $this->assertCanPublish($request->user());
        }

        $event->fill($this->eventAttributes($data));

        if (array_key_exists('qrIn', $data) && $data['qrIn']) {
            $event->qr_in_token = $data['qrIn'];
        }

        if (array_key_exists('qrOut', $data) && $data['qrOut']) {
            $event->qr_out_token = $data['qrOut'];
        }

        if ($publishingDraft) {
            $event->status = 'published';
            $event->review_status = $this->reviewForPublish();
        }

        $event->save();

        if ($publishingDraft) {
            $audit->record(
                $request->user(),
                'Published event',
                $event->title
            );
        } else {
            $audit->record(
                $request->user(),
                'Updated event',
                $event->title
            );
        }

        return new EventResource(
            $event->fresh()->load('organizer')->loadCount([
                'registrations as registered_count' => fn ($query) => $query
                    ->where('status', 'registered'),
                'attendances as checked_in_count' => fn ($query) => $query
                    ->where('registrations.status', 'registered')
                    ->whereNotNull('attendances.time_in'),
            ])
        );
    }

    public function publish(
        Request $request,
        int $event,
        AuditLogger $audit
    ) {
        $event = $this->ownEvent($request, $event);

        $this->assertCanPublish($request->user());

        if ($event->status !== 'draft') {
            abort(409, 'Only draft events can be published.');
        }

        if ($event->ends_at->isPast()) {
            abort(
                409,
                "This event's date has passed. Edit the date before publishing."
            );
        }

        $event->status = 'published';
        $event->review_status = $this->reviewForPublish();
        $event->save();

        $audit->record(
            $request->user(),
            'Published event',
            $event->title
        );

        return new EventResource(
            $event->fresh()->load('organizer')->loadCount([
                'registrations as registered_count' => fn ($query) => $query
                    ->where('status', 'registered'),
                'attendances as checked_in_count' => fn ($query) => $query
                    ->where('registrations.status', 'registered')
                    ->whereNotNull('attendances.time_in'),
            ])
        );
    }

    public function cancel(
        Request $request,
        int $event,
        AuditLogger $audit
    ) {
        $event = $this->ownEvent($request, $event);

        if ($event->status !== 'published') {
            abort(409, 'Only published events can be cancelled.');
        }

        if ($event->ends_at->isPast()) {
            abort(409, 'This event has already ended.');
        }

        $event->status = 'cancelled';
        $event->save();

        $audit->record(
            $request->user(),
            'Cancelled event',
            $event->title
        );

        return new EventResource(
            $event->fresh()->load('organizer')->loadCount([
                'registrations as registered_count' => fn ($query) => $query
                    ->where('status', 'registered'),
                'attendances as checked_in_count' => fn ($query) => $query
                    ->where('registrations.status', 'registered')
                    ->whereNotNull('attendances.time_in'),
            ])
        );
    }
}