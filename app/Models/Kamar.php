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

    public function lantai(): BelongsTo
    {
        return $this->belongsTo(Lantai::class);
    }

    public function penempatanKamar(): HasMany
    {
        return $this->hasMany(PenempatanKamar::class);
    }

    public function aset(): HasMany
    {
        return $this->hasMany(Aset::class);
    }
}
