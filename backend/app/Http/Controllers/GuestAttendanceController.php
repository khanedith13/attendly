<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\User;
use App\Services\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class GuestAttendanceController extends Controller
{
    public function __construct(
        private readonly AttendanceService $attendanceService,
    ) {
    }

    /**
     * Record attendance-in for a registered student without requiring login.
     */
    public function checkIn(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $student = $this->findAndVerifyStudent($data);
        $temporarySelfiePath = $this->storeTemporarySelfie($request);

        try {
            $attendance = $this->attendanceService->checkIn($student, [
                'qr_token' => $data['qr_token'],
            ]);

            $selfiePath = $this->moveSelfieToAttendancePath(
                $temporarySelfiePath,
                $attendance,
                'check-in',
            );
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($temporarySelfiePath);

            throw $exception;
        }

        return response()->json([
            'message' => 'Attendance in has been recorded.',
            'attendance' => $this->attendancePayload(
                $attendance,
                $student,
                $selfiePath
            ),
        ], 201);
    }

    /**
     * Record attendance-out for a registered student without requiring login.
     */
    public function checkOut(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $student = $this->findAndVerifyStudent($data);
        $temporarySelfiePath = $this->storeTemporarySelfie($request);

        try {
            $attendance = $this->attendanceService->checkOut($student, [
                'qr_token' => $data['qr_token'],
            ]);

            $selfiePath = $this->moveSelfieToAttendancePath(
                $temporarySelfiePath,
                $attendance,
                'check-out',
            );
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($temporarySelfiePath);

            throw $exception;
        }

        return response()->json([
            'message' => 'Attendance out has been recorded.',
            'attendance' => $this->attendancePayload(
                $attendance,
                $student,
                $selfiePath
            ),
        ]);
    }

    /**
     * Validate student details, QR token, and selfie.
     */
    private function rules(): array
    {
        return [
            'qr_token' => ['required', 'uuid'],
            'student_id' => ['required', 'string', 'max:20'],
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150'],
            'course' => ['required', 'string', 'max:100'],
            'year_level' => ['required', 'string', 'max:30'],
            'selfie' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],
        ];
    }

    /**
     * Find an active student and verify all submitted details.
     */
    private function findAndVerifyStudent(array $data): User
    {
        $student = User::query()
            ->where('student_id', trim($data['student_id']))
            ->where('role', 'student')
            ->where('status', 'active')
            ->first();

        if (
            ! $student
            || ! $this->sameValue($student->name, $data['name'])
            || ! $this->sameValue($student->email, $data['email'])
            || ! $this->sameValue($student->course, $data['course'])
            || ! $this->sameValue($student->year_level, $data['year_level'])
        ) {
            throw ValidationException::withMessages([
                'student_id' => [
                    'The submitted student details do not match an active registered student account.',
                ],
            ]);
        }

        return $student;
    }

    /**
     * Compare values without case or surrounding-space differences.
     */
    private function sameValue(?string $stored, string $submitted): bool
    {
        return hash_equals(
            Str::lower(trim((string) $stored)),
            Str::lower(trim($submitted)),
        );
    }

    /**
     * Store the uploaded selfie on Laravel's private local disk.
     */
    private function storeTemporarySelfie(Request $request): string
    {
        $file = $request->file('selfie');
        $extension = strtolower($file->extension());
        $filename = Str::uuid().'.'.$extension;

        $path = $file->storeAs(
            'attendance-selfies/tmp',
            $filename,
            'local'
        );

        if (! $path) {
            throw new RuntimeException(
                'The attendance selfie could not be stored.'
            );
        }

        return $path;
    }

    /**
     * Move the temporary upload to a private path associated with attendance.
     *
     * The current attendances table has no selfie column, so the attendance ID
     * is used to organize the check-in and check-out selfie files.
     */
    private function moveSelfieToAttendancePath(
        string $temporaryPath,
        Attendance $attendance,
        string $attendanceAction,
    ): string {
        $extension = pathinfo($temporaryPath, PATHINFO_EXTENSION);

        $destination = sprintf(
            'attendance-selfies/%d/%s.%s',
            $attendance->id,
            $attendanceAction,
            $extension,
        );

        if (! Storage::disk('local')->move($temporaryPath, $destination)) {
            throw new RuntimeException(
                'The attendance was recorded, but the selfie could not be finalized.'
            );
        }

        return $destination;
    }

    /**
     * Build the guest attendance receipt.
     */
    private function attendancePayload(
        Attendance $attendance,
        User $student,
        string $selfiePath,
    ): array {
        $attendance->loadMissing('registration.event');

        $event = $attendance->registration->event;

        return [
            'id' => $attendance->id,

            'event' => [
                'id' => $event->id,
                'title' => $event->title,
            ],

            'student' => [
                'id' => $student->id,
                'studentId' => $student->student_id,
                'name' => $student->name,
                'email' => $student->email,
                'course' => $student->course,
                'yearLevel' => $student->year_level,
            ],

            'timeIn' => $attendance->time_in?->toIso8601String(),
            'timeOut' => $attendance->time_out?->toIso8601String(),
            'status' => $attendance->attendance_status,

            'selfieStored' => true,
            'selfiePath' => $selfiePath,
        ];
    }
}
