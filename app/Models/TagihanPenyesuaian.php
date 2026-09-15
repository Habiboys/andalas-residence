<?php

namespace App\Models;

use App\Enums\SumberPenyesuaianTagihan;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TagihanPenyesuaian extends BaseModel
{
    protected $table = 'tagihan_penyesuaian';

    protected $fillable = ['tagihan_id', 'sumber', 'deskripsi', 'jumlah', 'metadata'];

    protected function casts(): array
    {
        return ['sumber' => SumberPenyesuaianTagihan::class, 'jumlah' => 'decimal:2', 'metadata' => 'array'];
    }

    /** @return BelongsTo<Tagihan, $this> */
    public function tagihan(): BelongsTo
    {
        return $this->belongsTo(Tagihan::class);
    }
}
