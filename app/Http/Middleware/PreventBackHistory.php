<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

class PreventBackHistory
{
    public function handle(Request $request, Closure $next): Response
    {
        $wasAuthenticated = Auth::check();
        $response = $next($request);

        if ($response instanceof BinaryFileResponse || $response->headers->has('Content-Disposition')) {
            return $response;
        }

        $contentType = (string) $response->headers->get('Content-Type', '');
        $shouldPreventCache = $wasAuthenticated
            || Auth::check()
            || $request->is('logout', 'api/auth/sso/logout', 'login', 'register')
            || $request->hasHeader('X-Inertia')
            || str_contains($contentType, 'text/html');

        if (! $shouldPreventCache) {
            return $response;
        }

        $response->headers->set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', 'Sat, 01 Jan 1990 00:00:00 GMT');

        return $response;
    }
}
