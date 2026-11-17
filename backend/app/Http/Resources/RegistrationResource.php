
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RegistrationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $event = $this->event;
        $attendance = $this->attendance;

        return [
            'id' => $this->id,
            'eventId' => $this->event_id,
            'qrToken' => $this->qr_token,
            'registeredAt' => $this->registered_at?->toISOString(),
            'registrationStatus' => $this->status,

            'title' => $event->title,
            'event' => $event->title,
            'description' => $event->description,
            'category' => $event->category,
            'venue' => $event->venue,
            'capacity' => (int) $event->capacity,

            'startsAt' => $event->starts_at->toISOString(),
            'endsAt' => $event->ends_at->toISOString(),

            'timeIn' => $attendance?->time_in?->toISOString(),
            'timeOut' => $attendance?->time_out?->toISOString(),
            'attendance' => $attendance?->attendance_status
                ?? 'absent',

            'registered' => $event->registrations()
                ->where('status', 'registered')
                ->count(),
        ];
    }
}
