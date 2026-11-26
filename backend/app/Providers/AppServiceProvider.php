<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Preserve the MySQL-only database connection enforcement from Step 1.
        $connections = config('database.connections', []);

        config([
            'database.connections' => array_intersect_key(
                $connections,
                ['mysql' => true],
            ),
        ]);
    }

    public function boot(): void
    {
        JsonResource::withoutWrapping();

        RateLimiter::for('login', function (Request $request) {
            $email = Str::lower(trim((string) $request->input('email')));

            return Limit::perMinute(5)->by($email.'|'.$request->ip());
        });

        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });

        RateLimiter::for('forgot-password', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });

        RateLimiter::for('reset-password', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // Many students share one school network at an event, so the IP limit is
        // generous and the tight limit applies per student ID on that IP.
        RateLimiter::for('guest-attendance', function (Request $request) {
            $studentId = Str::lower(trim((string) $request->input('student_id')));

            return [
                Limit::perMinute(300)->by('ip:'.$request->ip()),
                Limit::perMinute(10)->by('student:'.$studentId.'|'.$request->ip()),
            ];
        });
    }
}