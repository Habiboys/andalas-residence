<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureResidenceAccountAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user && $user->status !== 'aktif') {
            abort_unless($user->inactive_reason === 'letter_issued', 403, 'Akun dinonaktifkan oleh administrator.');
            if (! $request->isMethod('GET') && ! $request->isMethod('HEAD')) {
                abort_unless($request->routeIs('logout', 'andalas.registrations.store', 'andalas.pembayaran.store', 'andalas.pengajuan.bebas'), 403, 'Akun hanya dapat mengakses arsip dan pendaftaran hunian kembali.');
            }
        }

        return $next($request);
    }
}
