<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KegiatanPartisipan extends BaseModel
{
    protected $table = 'kegiatan_partisipan';

    protected $fillable = ['kegiatan_id', 'user_id', 'status_konfirmasi'];

    public function kegiatan(): BelongsTo
    {
        return $this->belongsTo(Kegiatan::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
