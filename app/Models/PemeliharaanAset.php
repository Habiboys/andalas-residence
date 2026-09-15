<?php

namespace App\Models;

use App\Enums\StatusPemeliharaanAset;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PemeliharaanAset extends BaseModel
{
    protected $table = 'pemeliharaan_aset';

    protected $fillable = ['aset_id', 'status', 'jenis', 'dijadwalkan_pada', 'dimulai_pada', 'selesai_pada', 'biaya', 'catatan'];

    protected function casts(): array
    {
        return [
            'status' => StatusPemeliharaanAset::class,
            'dijadwalkan_pada' => 'datetime',
            'dimulai_pada' => 'datetime',
            'selesai_pada' => 'datetime',
            'biaya' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Aset, $this> */
    public function aset(): BelongsTo
    {
        return $this->belongsTo(Aset::class);
    }
}
