<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlokasiPembayaran extends BaseModel
{
    protected $table = 'alokasi_pembayaran';

    protected $fillable = ['pembayaran_tagihan_id', 'tagihan_id', 'jadwal_cicilan_id', 'jumlah'];

    protected function casts(): array
    {
        return ['jumlah' => 'decimal:2'];
    }

    /** @return BelongsTo<PembayaranTagihan, $this> */
    public function pembayaran(): BelongsTo
    {
        return $this->belongsTo(PembayaranTagihan::class, 'pembayaran_tagihan_id');
    }

    /** @return BelongsTo<Tagihan, $this> */
    public function tagihan(): BelongsTo
    {
        return $this->belongsTo(Tagihan::class);
    }

    /** @return BelongsTo<JadwalCicilan, $this> */
    public function jadwalCicilan(): BelongsTo
    {
        return $this->belongsTo(JadwalCicilan::class);
    }
}
