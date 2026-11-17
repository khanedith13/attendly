<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();

        $mayScan = $viewer && (
            $viewer->isRole('admin')
            || $viewer->id === $this->organizer->user_id
        );

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description ?? '',
            'category' => $this->category,
            'venue' => $this->venue,
            'capacity' => $this->capacity,
            'status' => $this->status,
            'review' => $this->review_status,
            'reviewNote' => $this->review_note ?? '',
            'requireSchoolGmail' => (bool) $this->require_school_gmail,
            'sendConfirmation' => (bool) $this->send_confirmation_email,
            'startsAt' => $this->starts_at->toIso8601String(),
            'endsAt' => $this->ends_at->toIso8601String(),
            'organizer' => $this->organizer->organization_name,
            'ownerId' => $this->organizer->user_id,
            'registered' => (int) ($this->registered_count ?? 0),
            'checkedIn' => (int) ($this->checked_in_count ?? 0),
            'createdAt' => $this->created_at?->toIso8601String(),

            $this->mergeWhen($mayScan, [
                'qrIn' => $this->qr_in_token,
                'qrOut' => $this->qr_out_token,
            ]),
        ];
    }
}