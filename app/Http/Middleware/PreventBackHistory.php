<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

class PreventBackHistory
{
    public function handle(Request $request, Closure $next): Response
    {
        $wasAuthenticated = $request->user() !== null;
        $response = $next($request);

        $shouldPreventCache = $wasAuthenticated
            || $request->user() !== null
            || $request->is('logout')
            || $request->hasHeader('X-Inertia');

        if (! $shouldPreventCache || $response instanceof BinaryFileResponse || $response->headers->has('Content-Disposition')) {
            return $response;
        }

        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', 'Sat, 01 Jan 1990 00:00:00 GMT');

        return $response;
    }
}
