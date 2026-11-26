<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AttendanceSelfieController extends Controller
{
    /** Serve one attendance selfie to the holder of a valid signed receipt link. */
    public function show(Attendance $attendance, string $direction): BinaryFileResponse
    {
        $path = $direction === 'in'
            ? $attendance->selfie_in_path
            : $attendance->selfie_out_path;

        abort_unless(
            filled($path) && Storage::disk('local')->exists($path),
            404
        );

        return response()->file(
            Storage::disk('local')->path($path),
            ['Cache-Control' => 'private, no-store'],
        );
    }
}