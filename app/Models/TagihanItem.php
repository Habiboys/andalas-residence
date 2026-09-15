<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TagihanItem extends BaseModel
{
    protected $table = 'tagihan_items';

    protected $fillable = ['tagihan_id', 'deskripsi', 'kuantitas', 'harga_satuan', 'jumlah'];

    protected function casts(): array
    {
        return ['harga_satuan' => 'decimal:2', 'jumlah' => 'decimal:2'];
    }

    /** @return BelongsTo<Tagihan, $this> */
    public function tagihan(): BelongsTo
    {
        return $this->belongsTo(Tagihan::class);
    }
}
