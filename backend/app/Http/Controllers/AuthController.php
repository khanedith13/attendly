<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\EventOrganizer;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(
        RegisterRequest $request,
        AuditLogger $audit
    ): JsonResponse {
        $data = $request->validated();

        $user = new User([
            'name' => trim($data['firstName']).' '.trim($data['lastName']),
            'email' => strtolower($data['email']),
            'password' => $data['password'],
        ]);

        $user->role = $data['role'];
        $user->status = $data['role'] === 'organizer' ? 'pending' : 'active';
        $user->save();

        if ($user->role === 'organizer') {
            EventOrganizer::create([
                'user_id' => $user->id,
                'organization_name' => $user->name,
            ]);
        }

        $audit->record($user, 'Registered account', $user->email);

        return response()->json([
            'user' => new UserResource($user),
        ], 201);
    }

    public function login(
        LoginRequest $request,
        AuditLogger $audit
    ): JsonResponse {
        $email = strtolower($request->input('email'));
        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
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

        $token = $user->createToken('web', ['*'], $expires)->plainTextToken;

        $audit->record($user, 'Logged in', $email);

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): \Illuminate\Http\Response
    {
        $request->user()->currentAccessToken()?->delete();

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
            'email' => ['required', 'email'],
        ]);

        $email = strtolower($validated['email']);
        $user = User::where('email', $email)->first();

        if ($user) {
            $audit->record(
                $user,
                'Password reset requested',
                $user->email
            );
        }

        return response()->noContent(202);
    }
}