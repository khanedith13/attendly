<?php

namespace App\Http\Resources;

use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;

/**
 * The attendance receipt shared by logged-in student and guest attendance.
 *
 * @property Attendance $resource
 */
class AttendanceReceiptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $attendance = $this->resource;
        $registration = $attendance->registration;
        $student = $registration->user;
        $event = $registration->event;

        return [
            'id' => $attendance->id,
            'event' => [
                'id' => $event->id,
                'title' => $event->title,
            ],
            'student' => [
                'studentId' => $student->student_id,
                'name' => $student->name,
                'email' => $student->email,
                'course' => $student->course,
                'yearLevel' => $student->year_level,
            ],
            'timeIn' => $attendance->time_in?->toIso8601String(),
            'timeOut' => $attendance->time_out?->toIso8601String(),
            'status' => $attendance->attendance_status,
            'selfieInUrl' => $this->selfieUrl($attendance, 'in'),
            'selfieOutUrl' => $this->selfieUrl($attendance, 'out'),
        ];
    }

    /** Return a 30 minute signed link to the selfie, or null when none was saved. */
    private function selfieUrl(Attendance $attendance, string $direction): ?string
    {
        $path = $direction === 'in'
            ? $attendance->selfie_in_path
            : $attendance->selfie_out_path;

        if (blank($path)) {
            return null;
        }

        return URL::temporarySignedRoute(
            'attendance.selfie',
            now()->addMinutes(30),
            ['attendance' => $attendance->id, 'direction' => $direction],
        );
    }
}