<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AttendanceSelfieController;
use App\Http\Controllers\GuestAttendanceController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PublicSettingsController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OrganizerEventController;
use App\Http\Controllers\StudentEventController;
use App\Http\Controllers\StudentRegistrationController;
use App\Http\Controllers\OrganizerDashboardController;
use App\Http\Controllers\OrganizerRosterController;
use App\Http\Controllers\OrganizerProfileController;
use App\Http\Controllers\AdminSettingsController;
use App\Http\Controllers\AdminAuditLogController;
use App\Http\Controllers\AdminOrganizerController;
use App\Http\Controllers\AdminEventController;
use App\Http\Controllers\AdminAttendanceController;
use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\AdminUserController;

Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'message' => 'Attendly API is connected!',
    ]);
});

Route::get('/settings/public', [
    PublicSettingsController::class,
    'show',
]);

Route::prefix('attendance/guest')
    ->middleware('throttle:10,1')
    ->group(function () {
        Route::post('/check-in', [
            GuestAttendanceController::class,
            'checkIn',
        ]);

        Route::post('/check-out', [
            GuestAttendanceController::class,
            'checkOut',
        ]);
    });

    Route::get('/attendance/selfies/{attendance}/{direction}', [
        AttendanceSelfieController::class,
        'show',
    ])
        ->whereIn('direction', ['in', 'out'])
        ->middleware(['signed', 'throttle:60,1'])
        ->name('attendance.selfie');

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:register');

    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    Route::post('/forgot-password', [
        AuthController::class,
        'forgotPassword',
    ])->middleware('throttle:forgot-password');

    Route::post('/reset-password', [
        AuthController::class,
        'resetPassword',
    ])->middleware('throttle:reset-password');

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::middleware(['auth:sanctum', 'active', 'role:admin'])
    ->prefix('admin')
    ->group(function () {
        Route::get('/settings', [AdminSettingsController::class, 'show']);
        Route::put('/settings', [AdminSettingsController::class, 'update']);
        Route::get('/audit-logs', [AdminAuditLogController::class, 'index']);
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::patch('/users/{user}', [AdminUserController::class, 'update']);
        Route::get('/organizers', [AdminOrganizerController::class, 'index']);
        Route::patch('/organizers/{user}/status', [AdminOrganizerController::class, 'updateStatus']);
        Route::get('/events', [AdminEventController::class, 'index']);
        Route::patch('/events/{event}/review', [AdminEventController::class, 'updateReview']);
        Route::get('/attendance', [AdminAttendanceController::class, 'index']);
        Route::get('/dashboard', [AdminDashboardController::class, 'show']);
    });

Route::middleware([
    'auth:sanctum',
    'active',
    'role:student',
])->prefix('account')->group(function () {
    Route::get('/', [AccountController::class, 'show']);
    Route::put('/', [AccountController::class, 'update']);
    Route::put('/password', [AccountController::class, 'password']);
});

Route::middleware(['auth:sanctum', 'active', 'role:organizer'])
    ->prefix('organizer')
    ->group(function () {
        Route::get('/dashboard', [OrganizerDashboardController::class, 'show']);
        Route::get('/attendees', [OrganizerRosterController::class, 'attendees']);
        Route::get('/attendees/{registration}/selfie/{direction}', [OrganizerRosterController::class, 'selfie']);
        Route::get('/registrations', [OrganizerRosterController::class, 'registrations']);
        Route::get('/profile', [OrganizerProfileController::class, 'show']);
        Route::put('/profile', [OrganizerProfileController::class, 'update']);

        Route::get('/events', [OrganizerEventController::class, 'index']);
        Route::post('/events', [OrganizerEventController::class, 'store']);
        Route::get('/events/{event}', [OrganizerEventController::class, 'show']);
        Route::put('/events/{event}', [OrganizerEventController::class, 'update']);
        Route::post('/events/{event}/publish', [OrganizerEventController::class, 'publish']);
        Route::post('/events/{event}/cancel', [OrganizerEventController::class, 'cancel']);
    });


Route::middleware(['auth:sanctum', 'active', 'role:student'])
    ->get('/events', [StudentEventController::class, 'index']);

Route::middleware([
    'auth:sanctum',
    'active',
    'role:student',
])->prefix('student')->group(function () {
    Route::get('/registrations', [
        StudentRegistrationController::class,
        'index',
    ]);

    Route::post('/events/{event}/register', [
        StudentRegistrationController::class,
        'store',
    ]);

    Route::delete('/registrations/{registration}', [
        StudentRegistrationController::class,
        'destroy',
    ]);

    Route::get('/attendance/active', [
        AttendanceController::class,
        'active',
    ]);

    Route::post('/attendance/check-in', [
        AttendanceController::class,
        'checkIn',
    ]);

    Route::post('/attendance/check-out', [
        AttendanceController::class,
        'checkOut',
    ]);
});