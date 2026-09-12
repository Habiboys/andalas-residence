<?php

namespace App\Services;

use App\Models\KuesionerPertanyaan;
use App\Models\PenilaianTeknisi;
use Illuminate\Support\Collection;

class QuestionnaireScoringService
{
    /**
     * @param  array<string, array{nilai_skor?: float|null, jawaban_teks?: string|null}>  $answers
     */
    public function calculate(Collection $pertanyaan, array $answers): array
    {
        $totalBobot = 0;
        $weightedSum = 0;
        $minPossible = 0;
        $maxPossible = 0;

        foreach ($pertanyaan as $p) {
            /** @var KuesionerPertanyaan $p */
            if ($p->tipe_jawaban === 'teks') {
                continue;
            }

            $answer = $answers[$p->id] ?? null;
            $score = $answer['nilai_skor'] ?? null;

            if ($p->wajib && $score === null) {
                throw new \InvalidArgumentException("Pertanyaan wajib belum dijawab: {$p->kode_pertanyaan}");
            }

            if ($score === null) {
                continue;
            }

            $bobot = (float) $p->bobot;
            $totalBobot += $bobot;
            $weightedSum += $score * $bobot;
            $minPossible += (float) $p->skor_minimal * $bobot;
            $maxPossible += (float) $p->skor_maksimal * $bobot;
        }

        if ($totalBobot <= 0) {
            return ['total_skor' => 0, 'skor_persentase' => 0];
        }

        $totalSkor = round($weightedSum / $totalBobot, 4);
        $range = max($maxPossible - $minPossible, 0.0001);
        $skorPersentase = round((($weightedSum - $minPossible) / $range) * 100, 2);

        return [
            'total_skor' => $totalSkor,
            'skor_persentase' => min(100, max(0, $skorPersentase)),
        ];
    }

    public function finalize(PenilaianTeknisi $penilaian, array $answers): PenilaianTeknisi
    {
        $pertanyaan = $penilaian->kuesioner->pertanyaan()->with('opsi')->get();
        $scores = $this->calculate($pertanyaan, $answers);

        foreach ($pertanyaan as $p) {
            $answer = $answers[$p->id] ?? [];
            $penilaian->jawaban()->create([
                'pertanyaan_id' => $p->id,
                'kode_pertanyaan_snapshot' => $p->kode_pertanyaan,
                'teks_pertanyaan_snapshot' => $p->teks_pertanyaan,
                'bobot_snapshot' => $p->bobot,
                'nilai_skor' => $answer['nilai_skor'] ?? null,
                'jawaban_teks' => $answer['jawaban_teks'] ?? null,
            ]);
        }

        $penilaian->update([
            'status' => 'final',
            'total_skor' => $scores['total_skor'],
            'skor_persentase' => $scores['skor_persentase'],
            'tanggal_penilaian' => now(),
        ]);

        return $penilaian->fresh('jawaban');
    }
}
