<?php

namespace App\Models;

use App\Enums\KondisiAset;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InspeksiAset extends BaseModel
{
    protected $table = 'inspeksi_aset';

    protected $fillable = ['aset_id', 'diperiksa_oleh', 'kondisi', 'diperiksa_pada', 'temuan'];

    protected function casts(): array
    {
        return ['kondisi' => KondisiAset::class, 'diperiksa_pada' => 'datetime'];
    }

    /** @return BelongsTo<Aset, $this> */
    public function aset(): BelongsTo
    {
        return $this->belongsTo(Aset::class);
    }

    /** @return BelongsTo<User, $this> */
    public function pemeriksa(): BelongsTo
    {
        return $this->belongsTo(User::class, 'diperiksa_oleh');
    }
}
