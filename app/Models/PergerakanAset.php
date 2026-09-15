<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PergerakanAset extends BaseModel
{
    protected $table = 'pergerakan_aset';

    protected $fillable = ['aset_id', 'lokasi_asal_id', 'lokasi_tujuan_id', 'dipindahkan_oleh', 'dipindahkan_pada', 'catatan'];

    protected function casts(): array
    {
        return ['dipindahkan_pada' => 'datetime'];
    }

    /** @return BelongsTo<Aset, $this> */
    public function aset(): BelongsTo
    {
        return $this->belongsTo(Aset::class);
    }

    /** @return BelongsTo<LokasiAset, $this> */
    public function lokasiAsal(): BelongsTo
    {
        return $this->belongsTo(LokasiAset::class, 'lokasi_asal_id');
    }

    /** @return BelongsTo<LokasiAset, $this> */
    public function lokasiTujuan(): BelongsTo
    {
        return $this->belongsTo(LokasiAset::class, 'lokasi_tujuan_id');
    }

    /** @return BelongsTo<User, $this> */
    public function pemindah(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dipindahkan_oleh');
    }
}
