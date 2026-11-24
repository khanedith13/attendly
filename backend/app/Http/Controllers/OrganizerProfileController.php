<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateOrganizerProfileRequest;
use App\Models\Event;
use App\Models\EventOrganizer;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrganizerProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $organizer = $request->user()->organizer
            ?? abort(403, 'No organizer profile for this account.');

        $events = Event::query()
            ->where('organizer_id', $organizer->id)
            ->where('status', 'published');

        return response()->json([
            'organizationName' => $organizer->organization_name,
            'contactNumber' => $organizer->contact_number ?? '',
            'notifications' => $request->user()->notification_preferences ?? [
                'registrations' => true,
                'capacity' => true,
                'daily' => false,
            ],
            'stats' => [
                'events' => (clone $events)->count(),
                'registrations' => (int) (clone $events)
                    ->withCount([
                        'registrations as registered_count' => fn ($query) => $query
                            ->where('status', 'registered'),
                    ])
                    ->get()
                    ->sum('registered_count'),
            ],
        ]);
    }

    public function update(
        UpdateOrganizerProfileRequest $request,
        AuditLogger $audit
    ): JsonResponse {
        $data = $request->validated();
        $user = $request->user();

        DB::transaction(function () use ($data, $user, $audit): void {
            $user->name = trim($data['name']);
            $user->notification_preferences = $data['notifications'];
            $user->save();

            $organizer = EventOrganizer::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();
            $organizer->organization_name = trim($data['organizationName']);
            $organizer->contact_number = trim($data['contactNumber'] ?? '');
            $organizer->save();

            $audit->record(
                $user,
                'Updated organizer profile',
                $organizer->organization_name
            );
        });

        return response()->json([
            'message' => 'Organizer profile updated successfully.',
        ]);
    }
}