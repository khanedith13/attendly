<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\UpdateAccountRequest;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AccountController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'studentId' => $user->student_id,
            'course' => $user->course,
            'yearLevel' => $user->year_level,
            'passwordChangedAt' => $user->password_changed_at,
            'notifications' => $user->notification_preferences ?? [
                'reminders' => true,
                'confirmations' => true,
            ],
        ]);
    }

    public function update(UpdateAccountRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        $user->name = $data['name'];
        $user->student_id = $data['studentId'];
        $user->course = $data['course'] ?? null;
        $user->year_level = $data['yearLevel'] ?? null;
        $user->notification_preferences = $data['notifications'];

        $user->save();

        return response()->json([
            'message' => 'Account updated successfully.',
        ]);
    }

    public function password(
        ChangePasswordRequest $request,
        AuditLogger $audit
    ): JsonResponse {
        $data = $request->validated();
        $user = $request->user();

        if (! Hash::check($data['currentPassword'], $user->password)) {
            throw ValidationException::withMessages([
                'currentPassword' => ['Current password is incorrect.'],
            ]);
        }

        $user->password = $data['newPassword'];
        $user->password_changed_at = now();
        $user->save();

        // Keep the current token; revoke every other device/session token.
        $currentToken = $user->currentAccessToken();

        $user->tokens()
            ->when(
                $currentToken && isset($currentToken->id),
                fn ($query) => $query->where(
                    'id',
                    '!=',
                    $currentToken->id
                )
            )
            ->delete();

        $audit->record(
            $user,
            'Password changed',
            $user->email
        );

        return response()->json([
            'message' => 'Password changed successfully.',
        ]);
    }
}