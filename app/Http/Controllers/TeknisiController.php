<?php

namespace App\Http\Controllers;

use App\Models\Kuesioner;
use App\Models\LaporanKerusakan;
use App\Models\PenilaianTeknisi;
use App\Services\QuestionnaireScoringService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TeknisiController extends Controller
{
    public function storePenilaian(Request $request, LaporanKerusakan $laporan, QuestionnaireScoringService $scoring): RedirectResponse
    {
        $this->authorizePermission($request, 'tiket.rate');

        if ($laporan->status !== 'selesai') {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'Tiket belum selesai.',
            ]);
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

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Penilaian teknisi berhasil disimpan.',
        ]);
    }
}
