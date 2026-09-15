<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JadwalCicilan extends BaseModel
{
    protected $table = 'jadwal_cicilan';

    protected $fillable = ['tagihan_id', 'termin_ke', 'jatuh_tempo', 'jumlah', 'status'];

    protected function casts(): array
    {
        return ['jatuh_tempo' => 'date', 'jumlah' => 'decimal:2'];
    }

    /** @return BelongsTo<Tagihan, $this> */
    public function tagihan(): BelongsTo
    {
        return $this->belongsTo(Tagihan::class);
    }
}
