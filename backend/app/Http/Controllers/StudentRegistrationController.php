<?php

namespace App\Http\Controllers;

use App\Http\Resources\RegistrationResource;
use App\Models\Registration;
use App\Services\RegistrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentRegistrationController extends Controller
{
    public function __construct(
        private readonly RegistrationService $registrationService
    ) {
    }

    /**
     * Register the authenticated student for an event.
     */
    public function store(Request $request, int $event): JsonResponse
    {
        $registration = $this->registrationService->register(
            $request->user(),
            $event
        );

        return response()->json([
            'message' => 'You have successfully registered for this event.',
            'registration' => (new RegistrationResource($registration))
                ->resolve($request),
        ], 201);
    }

    /**
     * Cancel one of the authenticated student's registrations.
     */
    public function destroy(
        Request $request,
        int $registration
    ): JsonResponse {
        $cancelled = $this->registrationService->cancel(
            $request->user(),
            $registration
        );

        return response()->json([
            'message' => 'Your registration has been cancelled.',
            'registration' => (new RegistrationResource($cancelled))
                ->resolve($request),
        ]);
    }

    /**
     * Return the authenticated student's registration lists.
     */
    public function index(Request $request): JsonResponse
    {
        $registrations = Registration::query()
            ->with([
                'event' => fn ($query) => $query->withCount([
                    'registrations as registered_count' => fn ($registrations) => $registrations
                        ->where('status', 'registered'),
                ]),
                'attendance',
            ])
            ->where('user_id', $request->user()->id)
            ->orderByDesc('registered_at')
            ->get();

        $now = now();

        $upcoming = $registrations
            ->filter(function (Registration $registration) use ($now) {
                return $registration->status === 'registered'
                    && $registration->event
                    && ! $registration->attendance?->time_in
                    && $now->lt($registration->event->ends_at);
            })
            ->sortBy(fn (Registration $registration) =>
                $registration->event->starts_at->timestamp
            )
            ->values();

        $cancelled = $registrations
            ->where('status', 'cancelled')
            ->values();

        $past = $registrations
            ->filter(function (Registration $registration) use ($now) {
                return $registration->status === 'registered'
                    && $registration->event
                    && (
                        $registration->attendance?->time_in !== null
                        || $now->gte($registration->event->ends_at)
                    );
            })
            ->values();

        $attendedCount = $past
            ->filter(fn (Registration $registration) =>
                $registration->attendance?->time_in !== null
            )
            ->count();

        return response()->json([
            'upcoming' => RegistrationResource::collection($upcoming)
                ->resolve($request),
            'cancelled' => RegistrationResource::collection($cancelled)
                ->resolve($request),
            'past' => RegistrationResource::collection($past)
                ->resolve($request),
            'counts' => [
                'total' => $upcoming->count()
                    + $cancelled->count()
                    + $past->count(),
                'upcoming' => $upcoming->count(),
                'past' => $past->count(),
                'attended' => $attendedCount,
                'cancelled' => $cancelled->count(),
            ],
        ]);
    }
}