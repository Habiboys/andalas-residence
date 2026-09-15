<?php

namespace App\Http\Controllers;

use App\Models\AbsensiSholat;
use App\Models\MahasiswaProfil;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AbsensiController extends Controller
{
    public function scan(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'absensi.scan');

        $validated = $request->validate([
            'barcode_code' => 'required|string',
            'waktu_sholat' => 'required|in:subuh,dzuhur,ashar,maghrib,isya',
        ]);

        $mhs = MahasiswaProfil::where('barcode_code', $validated['barcode_code'])->firstOrFail();

        $absensi = AbsensiSholat::firstOrCreate(
            [
                'mahasiswa_id' => $mhs->id,
                'waktu_sholat' => $validated['waktu_sholat'],
                'tanggal' => now()->toDateString(),
            ],
            [
                'waktu_scan' => now(),
                'discan_oleh' => $request->user()->id,
                'metode' => 'barcode_scan',
            ]
        );

        $result = [
            'absensi' => $absensi,
            'mahasiswa' => $mhs->load('user'),
            'already_scanned' => ! $absensi->wasRecentlyCreated,
        ];

        return redirect()->back()->with('scan_result', $result)->with('toast', [
            'type' => $result['already_scanned'] ? 'info' : 'success',
            'message' => $result['already_scanned']
                ? "{$mhs->nama} sudah scan hari ini."
                : "Scan berhasil untuk {$mhs->nama}.",
        ]);
    }
}
