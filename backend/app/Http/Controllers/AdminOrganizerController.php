<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateOrganizerStatusRequest;
use App\Models\EventOrganizer;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminOrganizerController extends Controller
{
    public function index(): JsonResponse
    {
        $organizers = EventOrganizer::query()
            ->with('user')
            ->withCount('events')
            ->withCount([
                'events as registrations_count' => fn ($query) => $query
                    ->join('registrations', 'events.id', '=', 'registrations.event_id')
                    ->where('registrations.status', 'registered'),
            ])
            ->whereHas('user', fn ($query) => $query->where('role', 'organizer'))
            ->get()
            ->map(fn (EventOrganizer $organizer): array => [
                'id' => $organizer->user_id,
                'name' => $organizer->organization_name,
                'phone' => $organizer->contact_number ?? '—',
                'events' => (int) $organizer->events_count,
                'registrations' => (int) $organizer->registrations_count,
                'status' => $organizer->user->status,
                'contactPerson' => $organizer->user->name,
                'email' => $organizer->user->email,
            ]);

        return response()->json(['data' => $organizers]);
    }

    public function updateStatus(
        UpdateOrganizerStatusRequest $request,
        int $user,
        AuditLogger $audit
    ): JsonResponse {
        $transitions = [
            'approve' => ['from' => 'pending', 'to' => 'active', 'log' => 'Approved organizer'],
            'reject' => ['from' => 'pending', 'to' => 'suspended', 'log' => 'Rejected organizer application'],
            'suspend' => ['from' => 'active', 'to' => 'suspended', 'log' => 'Suspended organizer'],
            'reactivate' => ['from' => 'suspended', 'to' => 'active', 'log' => 'Reactivated organizer'],
        ];

        $action = $request->validated()['action'];
        $transition = $transitions[$action];

        $organizer = DB::transaction(function () use (
            $user,
            $transition,
            $request,
            $audit
        ): User {
            $target = User::query()
                ->where('role', 'organizer')
                ->lockForUpdate()
                ->findOrFail($user);

            if (! $target->organizer) {
                abort(409, 'Organizer profile is missing.');
            }

            if ($target->status !== $transition['from']) {
                abort(409, "This organizer is already {$target->status}.");
            }

            $target->status = $transition['to'];
            $target->save();

            if ($target->status === 'suspended') {
                $target->tokens()->delete();
            }

            $audit->record(
                $request->user(),
                $transition['log'],
                $target->organizer->organization_name
            );

            return $target->fresh()->load('organizer');
        });

        return response()->json([
            'id' => $organizer->id,
            'status' => $organizer->status,
        ]);
    }
}