<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class RegistrationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $event = $this->event;

        $startsAt = Carbon::parse(
            $event->event_date . ' ' . $event->start_time
        );

        $endsAt = Carbon::parse(
            $event->event_date . ' ' . $event->end_time
        );

        return [
            // Registration identity
            'id' => $this->id,
            'eventId' => $this->event_id,
            'qrToken' => $this->qr_token,
            'registeredAt' => $this->registered_at?->toISOString(),
            'registrationStatus' => $this->status,

            // Event details used by the student UI
            'title' => $event->title,
            'description' => $event->description,
            'category' => $event->category,
            'venue' => $event->venue,
            'capacity' => (int) $event->capacity,
            'startsAt' => $startsAt->toISOString(),
            'endsAt' => $endsAt->toISOString(),

            // Current event registration count
            'registered' => $event->registrations()
                ->where('status', 'registered')
                ->count(),

            // QR token for this student's registration only
            'qrToken' => $this->qr_token,
        ];
    }
}