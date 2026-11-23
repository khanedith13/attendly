<?php

namespace App\Http\Controllers;

use App\Models\Registration;
use Illuminate\Http\JsonResponse;

class AdminAttendanceController extends Controller
{
    public function index(): JsonResponse
    {
        $records = Registration::query()
            ->with(['user', 'event', 'attendance'])
            ->where('status', 'registered')
            ->get()
            ->map(function (Registration $registration): ?array {
                $event = $registration->event;

                if ($event->status === 'cancelled') {
                    return null;
                }

                $attendance = $registration->attendance;
                $timeIn = $attendance?->time_in;
                $timeOut = $attendance?->time_out;

                if ($timeIn !== null) {
                    $outcome = $attendance->attendance_status;
                } elseif ($event->ends_at->isPast()) {
                    $outcome = 'absent';
                } else {
                    return null;
                }

                return [
                    'id' => $registration->id,
                    'name' => $registration->user->name,
                    'studentId' => $registration->user->student_id ?? '',
                    'eventTitle' => $event->title,
                    'eventStart' => $event->starts_at->toIso8601String(),
                    'timeIn' => $timeIn?->toIso8601String(),
                    'timeOut' => $timeOut?->toIso8601String(),
                    'outcome' => $outcome,
                ];
            })
            ->filter()
            ->sortByDesc('eventStart')
            ->values();

        return response()->json(['data' => $records]);
    }
}