<?php

namespace App\Http\Controllers;

use App\Models\AbsensiSholat;
use App\Models\MahasiswaProfil;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AbsensiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'absensi.view');

        $query = AbsensiSholat::with(['mahasiswa.user', 'scanner']);

        if ($request->filled('tanggal')) {
            $query->whereDate('tanggal', $request->tanggal);
        } else {
            $query->whereDate('tanggal', now()->toDateString());
        }

        return response()->json($query->latest('waktu_scan')->get());
    }

    public function scan(Request $request): JsonResponse
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

        return response()->json([
            'absensi' => $absensi,
            'mahasiswa' => $mhs->load('user'),
            'already_scanned' => ! $absensi->wasRecentlyCreated,
        ]);
    }
}
