<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAdminUserRequest;
use App\Http\Requests\UpdateAdminUserRequest;
use App\Http\Resources\UserResource;
use App\Models\EventOrganizer;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminUserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::query()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'joinedAt' => $user->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $users]);
    }

    public function store(
        StoreAdminUserRequest $request,
        AuditLogger $audit
    ): JsonResponse {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data, $request, $audit): User {
            $user = new User([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
            ]);
            $user->role = $data['role'];
            $user->status = $data['status'] ?? 'active';
            $user->save();

            if ($user->role === 'organizer') {
                EventOrganizer::create([
                    'user_id' => $user->id,
                    'organization_name' => $user->name,
                ]);
            }

            $audit->record($request->user(), 'Created '.$user->role.' account', $user->email);

            return $user;
        });

        return response()->json([
            'user' => new UserResource($user),
            'joinedAt' => $user->created_at?->toIso8601String(),
        ], 201);
    }

    public function update(
        UpdateAdminUserRequest $request,
        int $user,
        AuditLogger $audit
    ): JsonResponse {
        $data = $request->validated();

        if ($data === []) {
            abort(422, 'Provide at least one user field to update.');
        }

        $updated = DB::transaction(function () use ($data, $request, $user, $audit): User {
            $activeAdmins = User::query()
                ->where('role', 'admin')
                ->where('status', 'active')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $target = User::query()->lockForUpdate()->findOrFail($user);
            $nextRole = $data['role'] ?? $target->role;
            $nextStatus = $data['status'] ?? $target->status;

            if (
                $target->id === $request->user()->id
                && ($nextRole !== $target->role || $nextStatus !== $target->status)
            ) {
                abort(409, 'You cannot change your own role or status.');
            }

            $losesActiveAdmin = $target->role === 'admin'
                && $target->status === 'active'
                && ($nextRole !== 'admin' || $nextStatus !== 'active');

            if ($losesActiveAdmin && $activeAdmins->count() <= 1) {
                abort(409, 'At least one active admin is required.');
            }

            $target->fill([
                'name' => $data['name'] ?? $target->name,
            ]);
            $target->role = $nextRole;
            $target->status = $nextStatus;
            $target->save();

            if ($target->role === 'organizer') {
                EventOrganizer::firstOrCreate(
                    ['user_id' => $target->id],
                    ['organization_name' => $target->name]
                );
            }

            if ($nextStatus === 'suspended' && $target->wasChanged('status')) {
                $target->tokens()->delete();
            }

            $action = match (true) {
                $target->wasChanged('status') && $nextStatus === 'suspended' => 'Suspended user',
                $target->wasChanged('status') && $nextStatus === 'active' => 'Activated user',
                $target->wasChanged('role') => 'Changed user role',
                default => 'Updated user',
            };

            $audit->record($request->user(), $action, $target->email);

            return $target->fresh();
        });

        return response()->json(['user' => new UserResource($updated)]);
    }
}