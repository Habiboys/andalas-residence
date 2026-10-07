<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\WilayahSyncService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class WilayahSyncController extends Controller
{
    public function __invoke(Request $request, WilayahSyncService $service): RedirectResponse
    {
        abort_unless($request->user()->can('master.manage'), 403);
        try {
            $result = $service->sync();
        } catch (ConnectionException|RequestException $exception) {
            throw ValidationException::withMessages(['wilayah' => 'Tidak dapat menghubungi wilayah.id. Silakan coba lagi; data lama tetap tersedia.']);
        }

        return back()->with('toast', ['type' => 'success', 'message' => "Sinkronisasi selesai: {$result['provinces']} provinsi dan {$result['cities']} kota/kabupaten."]);
    }
}
