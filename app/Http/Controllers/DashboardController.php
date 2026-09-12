<?php

namespace App\Http\Controllers;

use App\Models\Kamar;
use App\Models\LaporanKerusakan;
use App\Models\MahasiswaProfil;
use App\Models\Pembayaran;
use App\Models\PengajuanBebasAsrama;
use App\Models\PengajuanIzinPulang;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'dashboard.view');

        return response()->json([
            'okupansi' => [
                'total_kamar' => Kamar::count(),
                'penuh' => Kamar::where('status', 'penuh')->count(),
                'kosong' => Kamar::where('status', 'kosong')->count(),
            ],
            'pembayaran_pending' => Pembayaran::where('status', 'menunggu_verifikasi')->count(),
            'tiket_aktif' => LaporanKerusakan::whereNotIn('status', ['selesai', 'dibatalkan'])->count(),
            'pengajuan_pending' => PengajuanBebasAsrama::where('status', 'diajukan')->count()
                + PengajuanIzinPulang::where('status', 'diajukan')->count(),
            'penghuni_aktif' => MahasiswaProfil::where('status_huni', 'aktif')->count(),
        ]);
    }
}
