<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\EventOrganizer;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class AuthController extends Controller
{
    public function register(
        RegisterRequest $request,
        AuditLogger $audit
    ): JsonResponse {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data, $audit) {
            $user = new User([
                'name' => trim($data['firstName']).' '.trim($data['lastName']),
                'email' => $data['email'],
                'password' => $data['password'],
            ]);

            $user->role = $data['role'];
            $user->status = $data['role'] === 'organizer'
                ? 'pending'
                : 'active';

            $user->save();

            if ($user->role === 'organizer') {
                EventOrganizer::create([
                    'user_id' => $user->id,
                    'organization_name' => $user->name,
                ]);
            }

            $audit->record(
                $user,
                'Registered account',
                $user->email
            );

            return $user;
        });

        return response()->json([
            'user' => new UserResource($user),
        ], 201);
    }

    public function login(
        LoginRequest $request,
        AuditLogger $audit
    ): JsonResponse {
        $email = $request->validated()['email'];
        $user = User::where('email', $email)->first();

        if (
            ! $user
            || ! Hash::check($request->input('password'), $user->password)
        ) {
            $audit->record(
                $user,
                'Login attempt',
                $email,
                'failed',
                $email
            );

            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        if ($user->status === 'suspended') {
            $audit->record(
                $user,
                'Login blocked (suspended)',
                $email,
                'failed'
            );

            return response()->json([
                'message' => 'This account has been suspended. Contact an administrator.',
            ], 403);
        }

        $expires = $request->boolean('remember')
            ? now()->addDays(30)
            : now()->addDay();

        $token = $user->createToken(
            'web',
            ['*'],
            $expires
        )->plainTextToken;

        $audit->record($user, 'Logged in', $email);

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ]);
    }

    public function logout(
        Request $request,
        AuditLogger $audit
    ): \Illuminate\Http\Response {
        $user = $request->user();

        $audit->record($user, 'Logged out', $user->email);

        $user->currentAccessToken()?->delete();

        return response()->noContent();
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()),
        ]);
    }

    public function forgotPassword(
        Request $request,
        AuditLogger $audit
    ): \Illuminate\Http\Response {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:150'],
        ]);

        $email = Str::lower(trim($validated['email']));

        try {
            $status = Password::sendResetLink([
                'email' => $email,
            ]);
        } catch (Throwable $exception) {
            // Mail is only attempted for real accounts, so an error response
            // would reveal which emails are registered. Log it and answer the
            // same way as a success.
            report($exception);

            return response()->noContent(202);
        }

        if ($status === Password::RESET_LINK_SENT) {
            $user = User::where('email', $email)->first();

            if ($user) {
                $audit->record(
                    $user,
                    'Password reset requested',
                    $user->email
                );
            }
        }

        // Do not reveal whether the email address belongs to an account.
        return response()->noContent(202);
    }

    public function resetPassword(
        Request $request,
        AuditLogger $audit
    ): JsonResponse {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email', 'max:150'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $validated['email'] = Str::lower(trim($validated['email']));

        $status = Password::reset(
            [
                'email' => $validated['email'],
                'token' => $validated['token'],
                'password' => $validated['password'],
                'password_confirmation' => $request->input(
                    'password_confirmation'
                ),
            ],
            function (User $user, string $password) use ($audit) {
                $user->forceFill([
                    'password' => $password,
                    'password_changed_at' => now(),
                    'remember_token' => Str::random(60),
                ])->save();

                // A reset invalidates every previously issued API token.
                $user->tokens()->delete();

                $audit->record(
                    $user,
                    'Password reset completed',
                    $user->email
                );

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Password reset successfully.',
            ]);
        }

        if ($status === Password::RESET_THROTTLED) {
            return response()->json([
                'message' => 'Please wait before trying again.',
            ], 429);
        }

        return response()->json([
            'message' => 'This password reset link is invalid or has expired.',
        ], 422);
    }
}