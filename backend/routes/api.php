<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PublicSettingsController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OrganizerEventController;
use App\Http\Controllers\StudentEventController;
use App\Http\Controllers\StudentRegistrationController;

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

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [
        AuthController::class,
        'forgotPassword',
    ]);

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
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
    });