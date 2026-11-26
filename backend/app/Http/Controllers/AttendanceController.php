<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckInRequest;
use App\Http\Requests\CheckOutRequest;
use App\Http\Resources\AttendanceReceiptResource;
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
                ? (new AttendanceReceiptResource($attendance))->resolve()
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
            'attendance' => (new AttendanceReceiptResource($attendance))->resolve(),
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
            'attendance' => (new AttendanceReceiptResource($attendance))->resolve(),
        ]);
    }
}