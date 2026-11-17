<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PublicSettingsController;
use Illuminate\Support\Facades\Route;

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