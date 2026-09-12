<?php

namespace App\Http\Controllers;

use App\Models\Kuesioner;
use App\Models\LaporanKerusakan;
use App\Models\PenilaianTeknisi;
use App\Models\User;
use App\Services\QuestionnaireScoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeknisiController extends Controller
{
    public function performance(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'teknisi.performance.view');

        $teknisi = User::role('teknisi')->get();

        $stats = $teknisi->map(function (User $user) {
            $penilaian = PenilaianTeknisi::where('teknisi_id', $user->id)->where('status', 'final')->get();
            $tiketSelesai = LaporanKerusakan::where('teknisi_id', $user->id)->where('status', 'selesai')->count();

            return [
                'teknisi_id' => $user->id,
                'nama' => $user->nama,
                'nim_nip' => $user->nim_nip,
                'rata_skor' => $penilaian->avg('total_skor'),
                'total_tiket' => $tiketSelesai,
                'total_penilaian' => $penilaian->count(),
            ];
        });

        return response()->json($stats);
    }

    public function storePenilaian(Request $request, LaporanKerusakan $laporan, QuestionnaireScoringService $scoring): JsonResponse
    {
        $this->authorizePermission($request, 'tiket.rate');

        if ($laporan->status !== 'selesai') {
            return response()->json(['message' => 'Tiket belum selesai'], 422);
        }

        $kuesioner = Kuesioner::where('status', 'aktif')->where('jenis', 'penilaian_teknisi')->firstOrFail();

        $validated = $request->validate([
            'answers' => 'required|array',
            'catatan_umum' => 'nullable|string',
        ]);

        $penilaian = PenilaianTeknisi::create([
            'laporan_kerusakan_id' => $laporan->id,
            'kuesioner_id' => $kuesioner->id,
            'teknisi_id' => $laporan->teknisi_id,
            'dinilai_oleh' => $request->user()->id,
            'status' => 'draft',
            'catatan_umum' => $validated['catatan_umum'] ?? null,
        ]);

        $penilaian->setRelation('kuesioner', $kuesioner);
        $final = $scoring->finalize($penilaian, $validated['answers']);

        return response()->json($final, 201);
    }
}
