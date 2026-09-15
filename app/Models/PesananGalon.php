<?php

namespace App\Models;

use App\Enums\StatusPesananLayanan;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PesananGalon extends BaseModel
{
    protected $table = 'pesanan_galon';

    protected $fillable = ['nomor', 'penempatan_kamar_id', 'tagihan_item_id', 'status', 'jumlah', 'harga', 'diantar_pada', 'catatan'];

    protected function casts(): array
    {
        return ['status' => StatusPesananLayanan::class, 'harga' => 'decimal:2', 'diantar_pada' => 'datetime'];
    }

    /** @return BelongsTo<PenempatanKamar, $this> */
    public function penempatanKamar(): BelongsTo
    {
        return $this->belongsTo(PenempatanKamar::class);
    }

    /** @return BelongsTo<TagihanItem, $this> */
    public function tagihanItem(): BelongsTo
    {
        return $this->belongsTo(TagihanItem::class);
    }
}
