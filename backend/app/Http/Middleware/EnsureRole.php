<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(
        Request $request,
        Closure $next,
        string ...$roles
    ): Response {
        if (! $request->user() || ! $request->user()->isRole(...$roles)) {
            return response()->json([
                'message' => 'You do not have access to this resource.',
            ], 403);
        }

        return $next($request);
    }
}