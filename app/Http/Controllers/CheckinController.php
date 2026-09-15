<?php

namespace App\Http\Controllers;

use App\Models\Checkin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CheckinController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'checkin.create');

        $mhs = $request->user()->mahasiswaProfil;
        abort_unless($mhs, 403);

        $validated = $request->validate([
            'tanggal_rencana_masuk' => 'required|date|after_or_equal:today',
        ]);

        $checkin = Checkin::create([
            'mahasiswa_id' => $mhs->id,
            'periode_id' => $mhs->periode_id,
            'tanggal_rencana_masuk' => $validated['tanggal_rencana_masuk'],
            'status' => 'menunggu_verifikasi_pembayaran',
        ]);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Check-in berhasil diajukan. Lanjutkan pembayaran untuk verifikasi.',
        ]);
    }
}
