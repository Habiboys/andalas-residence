<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Kamar extends BaseModel
{
    protected $table = 'kamar';

    protected $fillable = ['lantai_id', 'nomor_kamar', 'kapasitas', 'status', 'tipe_kamar', 'tarif_per_periode'];

    protected function casts(): array
    {
        return ['tarif_per_periode' => 'decimal:2'];
    }

    /** @return BelongsTo<Lantai, $this> */
    public function lantai(): BelongsTo
    {
        return $this->belongsTo(Lantai::class);
    }

    /** @return HasMany<PenempatanKamar, $this> */
    public function penempatanKamar(): HasMany
    {
        return $this->hasMany(PenempatanKamar::class);
    }

    /** @return HasMany<Aset, $this> */
    public function aset(): HasMany
    {
        return $this->hasMany(Aset::class);
    }

    /** @return HasMany<RoomPreference, $this> */
    public function roomPreferences(): HasMany
    {
        return $this->hasMany(RoomPreference::class);
    }
}
