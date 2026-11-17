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
            'id' => $this->id,
            'eventId' => $this->event_id,
            'qrToken' => $this->qr_token,
            'registeredAt' => $this->registered_at?->toISOString(),
            'registrationStatus' => $this->status,

            'title' => $event->title,
            'description' => $event->description,
            'category' => $event->category,
            'venue' => $event->venue,
            'capacity' => (int) $event->capacity,
            'startsAt' => $startsAt->toISOString(),
            'endsAt' => $endsAt->toISOString(),

            'registered' => $event->registrations()
                ->where('status', 'registered')
                ->count(),
        ];
    }
}