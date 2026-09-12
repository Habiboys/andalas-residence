<?php

namespace App\Http\Controllers;

use App\Models\LaporanKerusakan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TiketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAnyPermission($request, ['tiket.view', 'tiket.create']);

        $query = LaporanKerusakan::with(['aset', 'kamar', 'pelapor', 'teknisi', 'penilaian']);

        if ($request->user()->hasRole('teknisi')) {
            $query->where(function ($q) use ($request) {
                $q->whereNull('teknisi_id')->orWhere('teknisi_id', $request->user()->id);
            });
        }

        return response()->json($query->latest('tanggal_lapor')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'tiket.create');

        $validated = $request->validate([
            'aset_id' => 'nullable|uuid|exists:aset,id',
            'kamar_id' => 'nullable|uuid|exists:kamar,id',
            'deskripsi' => 'required|string',
        ]);

        $laporan = LaporanKerusakan::create([
            ...$validated,
            'nomor_tiket' => 'TKT-'.strtoupper(Str::random(8)),
            'dilaporkan_oleh' => $request->user()->id,
            'status' => 'menunggu_triage',
            'tanggal_lapor' => now(),
        ]);

        return response()->json($laporan, 201);
    }

    public function update(Request $request, LaporanKerusakan $laporan): JsonResponse
    {
        $this->authorizePermission($request, 'tiket.update');

        $validated = $request->validate([
            'status' => 'required|in:didisposisikan,sedang_dikerjakan,selesai,dibatalkan',
            'catatan_penyelesaian' => 'nullable|string',
            'metode_penanganan' => 'nullable|in:perbaikan,penggantian',
            'biaya_riil' => 'nullable|numeric',
        ]);

        if ($request->user()->hasRole('teknisi') && ! $laporan->teknisi_id) {
            $validated['teknisi_id'] = $request->user()->id;
        }

        if ($validated['status'] === 'selesai') {
            $validated['tanggal_selesai'] = now();
        }

        $laporan->update($validated);

        return response()->json($laporan->fresh());
    }
}
