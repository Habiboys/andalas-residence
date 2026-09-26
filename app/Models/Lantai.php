<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lantai extends BaseModel
{
    protected $table = 'lantai';

    protected $fillable = ['gedung_id', 'nomor_lantai', 'nama_lantai'];

    /** @return BelongsTo<Gedung, $this> */
    public function gedung(): BelongsTo
    {
        return $this->belongsTo(Gedung::class);
    }

    /** @return HasMany<Kamar, $this> */
    public function kamar(): HasMany
    {
        return $this->hasMany(Kamar::class);
    }
}
