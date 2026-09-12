<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PenilaianTeknisi extends BaseModel
{
    protected $table = 'penilaian_teknisi';

    protected $fillable = [
        'laporan_kerusakan_id', 'kuesioner_id', 'teknisi_id', 'dinilai_oleh',
        'status', 'total_skor', 'skor_persentase', 'catatan_umum', 'tanggal_penilaian',
    ];

    protected function casts(): array
    {
        return [
            'total_skor' => 'decimal:4',
            'skor_persentase' => 'decimal:2',
            'tanggal_penilaian' => 'datetime',
        ];
    }

    public function laporanKerusakan(): BelongsTo
    {
        return $this->belongsTo(LaporanKerusakan::class);
    }

    public function kuesioner(): BelongsTo
    {
        return $this->belongsTo(Kuesioner::class);
    }

    public function teknisi(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teknisi_id');
    }

    public function penilai(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dinilai_oleh');
    }

    public function jawaban(): HasMany
    {
        return $this->hasMany(JawabanPenilaianTeknisi::class);
    }
}
