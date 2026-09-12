<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KuesionerPertanyaan extends BaseModel
{
    protected $table = 'kuesioner_pertanyaan';

    protected $fillable = [
        'kuesioner_id', 'kode_pertanyaan', 'teks_pertanyaan', 'tipe_jawaban',
        'bobot', 'skor_minimal', 'skor_maksimal', 'wajib', 'urutan',
    ];

    protected function casts(): array
    {
        return [
            'bobot' => 'decimal:4',
            'skor_minimal' => 'decimal:4',
            'skor_maksimal' => 'decimal:4',
            'wajib' => 'boolean',
        ];
    }

    public function kuesioner(): BelongsTo
    {
        return $this->belongsTo(Kuesioner::class);
    }

    public function opsi(): HasMany
    {
        return $this->hasMany(KuesionerOpsi::class, 'pertanyaan_id')->orderBy('urutan');
    }
}
