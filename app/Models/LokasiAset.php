<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LokasiAset extends BaseModel
{
    protected $table = 'lokasi_aset';

    protected $fillable = ['aset_id', 'kamar_id', 'fasilitas_umum_id', 'nama_lokasi', 'mulai_pada', 'selesai_pada'];

    protected function casts(): array
    {
        return ['mulai_pada' => 'datetime', 'selesai_pada' => 'datetime'];
    }

    /** @return BelongsTo<Aset, $this> */
    public function aset(): BelongsTo
    {
        return $this->belongsTo(Aset::class);
    }

    /** @return BelongsTo<Kamar, $this> */
    public function kamar(): BelongsTo
    {
        return $this->belongsTo(Kamar::class);
    }

    /** @return BelongsTo<FasilitasUmum, $this> */
    public function fasilitasUmum(): BelongsTo
    {
        return $this->belongsTo(FasilitasUmum::class);
    }

    /** @return HasMany<PergerakanAset, $this> */
    public function pergerakanAsal(): HasMany
    {
        return $this->hasMany(PergerakanAset::class, 'lokasi_asal_id');
    }

    /** @return HasMany<PergerakanAset, $this> */
    public function pergerakanTujuan(): HasMany
    {
        return $this->hasMany(PergerakanAset::class, 'lokasi_tujuan_id');
    }
}
