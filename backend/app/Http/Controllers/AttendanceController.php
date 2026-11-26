<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckInRequest;
use App\Http\Requests\CheckOutRequest;
use App\Models\Attendance;
use App\Services\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Throwable;

class AttendanceController extends Controller
{
    public function __construct(
        private readonly AttendanceService $attendanceService,
    ) {
    }

    /** Return the authenticated student's active attendance session, if any. */
    public function active(Request $request): JsonResponse
    {
        $attendance = $this->attendanceService->activeFor($request->user());

        return response()->json([
            'activeSession' => $attendance
                ? $this->attendancePayload($attendance)
                : null,
        ]);
    }

    /** Record attendance-in for the authenticated student's registration. */
    public function checkIn(CheckInRequest $request): JsonResponse
    {
        $data = $request->validated();
        $path = $request->file('selfie')->store('attendance/selfies', 'local');

        try {
            $attendance = $this->attendanceService->checkIn(
                $request->user(),
                [...$data, 'selfie_in_path' => $path],
            );
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json([
            'message' => 'Attendance in has been recorded.',
            'attendance' => $this->attendancePayload($attendance),
        ], 201);
    }

    /** Close the authenticated student's active attendance session. */
    public function checkOut(CheckOutRequest $request): JsonResponse
    {
        $data = $request->validated();
        $path = $request->file('selfie')->store('attendance/selfies', 'local');

        try {
            $attendance = $this->attendanceService->checkOut(
                $request->user(),
                [...$data, 'selfie_out_path' => $path],
            );
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json([
            'message' => 'Attendance out has been recorded.',
            'attendance' => $this->attendancePayload($attendance),
        ]);
    }

    /** Convert an attendance record to the public API response shape. */
    private function attendancePayload(Attendance $attendance): array
    {
        $registration = $attendance->registration;
        $event = $registration->event;

        return [
            'id' => $attendance->id,
            'event' => [
                'id' => $event->id,
                'title' => $event->title,
            ],
            'student' => [
                'studentId' => $registration->user->student_id,
                'name' => $registration->user->name,
                'email' => $registration->user->email,
                'course' => $registration->user->course,
                'yearLevel' => $registration->user->year_level,
            ],
            'timeIn' => $attendance->time_in?->toIso8601String(),
            'timeOut' => $attendance->time_out?->toIso8601String(),
            'status' => $attendance->attendance_status,
        ];
    }
}
