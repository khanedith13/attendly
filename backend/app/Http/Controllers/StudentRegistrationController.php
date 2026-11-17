<?php

namespace App\Http\Controllers;

use App\Http\Resources\RegistrationResource;
use App\Models\Registration;
use App\Services\RegistrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

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
            ->with(['event', 'attendance'])
            ->where('user_id', $request->user()->id)
            ->orderByDesc('registered_at')
            ->get();

        $upcoming = $registrations
            ->filter(function (Registration $registration) {
                return $registration->status === 'registered'
                    && $registration->event
                    && ! $registration->attendance?->time_in
                    && now()->lt(
                        $this->eventEnd($registration)
                    );
            })
            ->sortBy(fn (Registration $registration) =>
                $this->eventStart($registration)->timestamp
            )
            ->values();

        $cancelled = $registrations
            ->where('status', 'cancelled')
            ->values();

        $past = $registrations
            ->filter(function (Registration $registration) {
                return $registration->status === 'registered'
                    && $registration->event
                    && (
                        $registration->attendance?->time_in !== null
                        || now()->gte($this->eventEnd($registration))
                    );
            })
            ->values();

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
                'attended' => $past->count(),
                'cancelled' => $cancelled->count(),
            ],
        ]);
    }

    private function eventStart(Registration $registration)
    {
        return \Illuminate\Support\Carbon::parse(
            $registration->event->event_date . ' '
            . $registration->event->start_time
        );
    }

    private function eventEnd(Registration $registration)
    {
        return \Illuminate\Support\Carbon::parse(
            $registration->event->event_date . ' '
            . $registration->event->end_time
        );
    }
}