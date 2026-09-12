<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KuesionerOpsi extends BaseModel
{
    protected $table = 'kuesioner_opsi';

    protected $fillable = ['pertanyaan_id', 'label', 'nilai_skor', 'urutan'];

    protected function casts(): array
    {
        return ['nilai_skor' => 'decimal:4'];
    }

    public function pertanyaan(): BelongsTo
    {
        return $this->belongsTo(KuesionerPertanyaan::class, 'pertanyaan_id');
    }
}
