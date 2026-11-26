<?php

namespace App\Http\Controllers;

use App\Http\Requests\GuestCheckInRequest;
use App\Http\Requests\GuestCheckOutRequest;
use App\Models\Attendance;
use App\Services\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Throwable;

class GuestAttendanceController extends Controller
{
    public function __construct(
        private readonly AttendanceService $attendanceService,
    ) {
    }

    public function checkIn(GuestCheckInRequest $request): JsonResponse
    {
        $data = $request->validated();
        $path = $request->file('selfie')->store('attendance/selfies', 'local');

        try {
            $attendance = $this->attendanceService->checkInGuest([
                ...$data,
                'selfie_in_path' => $path,
            ]);
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json([
            'message' => 'Guest attendance in has been recorded.',
            'attendance' => $this->attendancePayload($attendance),
        ], 201);
    }

    public function checkOut(GuestCheckOutRequest $request): JsonResponse
    {
        $data = $request->validated();
        $path = $request->file('selfie')->store('attendance/selfies', 'local');

        try {
            $attendance = $this->attendanceService->checkOutGuest([
                ...$data,
                'selfie_out_path' => $path,
            ]);
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json([
            'message' => 'Guest attendance out has been recorded.',
            'attendance' => $this->attendancePayload($attendance),
        ]);
    }

    private function attendancePayload(Attendance $attendance): array
    {
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
        ];
    }
}
