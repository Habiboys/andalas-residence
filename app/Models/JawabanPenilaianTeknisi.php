<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JawabanPenilaianTeknisi extends BaseModel
{
    protected $table = 'jawaban_penilaian_teknisi';

    protected $fillable = [
        'penilaian_teknisi_id', 'pertanyaan_id', 'kode_pertanyaan_snapshot',
        'teks_pertanyaan_snapshot', 'bobot_snapshot', 'nilai_skor', 'jawaban_teks',
    ];

    protected function casts(): array
    {
        return [
            'bobot_snapshot' => 'decimal:4',
            'nilai_skor' => 'decimal:4',
        ];
    }

    public function penilaian(): BelongsTo
    {
        return $this->belongsTo(PenilaianTeknisi::class, 'penilaian_teknisi_id');
    }
}
