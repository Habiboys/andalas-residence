<?php

namespace App\Http\Responses;

use Inertia\Inertia;
use Laravel\Fortify\Contracts\LogoutResponse as LogoutResponseContract;
use Symfony\Component\HttpFoundation\Response;

class LogoutResponse implements LogoutResponseContract
{
    public function toResponse($request): Response
    {
        Inertia::clearHistory();

        if ($request->header('X-Inertia')) {
            return Inertia::location(route('landing'));
        }

        return $request->wantsJson()
            ? response()->json('', 204)
            : redirect('/');
    }
}
