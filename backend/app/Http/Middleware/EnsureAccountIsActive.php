<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->status === 'suspended') {
            $user->tokens()->delete();

            return response()->json([
                'message' => 'This account has been suspended. Contact an administrator.',
            ], 403);
        }

        return $next($request);
    }
}