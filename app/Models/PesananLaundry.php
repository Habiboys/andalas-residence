<?php

namespace App\Models;

use App\Enums\StatusPesananLayanan;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PesananLaundry extends BaseModel
{
    protected $table = 'pesanan_laundry';

    protected $fillable = ['nomor', 'penempatan_kamar_id', 'tagihan_item_id', 'status', 'berat_kg', 'harga', 'diambil_pada', 'selesai_pada', 'catatan'];

    protected function casts(): array
    {
        return [
            'status' => StatusPesananLayanan::class,
            'berat_kg' => 'decimal:2',
            'harga' => 'decimal:2',
            'diambil_pada' => 'datetime',
            'selesai_pada' => 'datetime',
        ];
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
