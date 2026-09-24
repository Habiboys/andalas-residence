<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class StokAset extends BaseModel
{
    protected $table = 'stok_aset';

    protected $fillable = ['kode', 'nama', 'kategori', 'satuan', 'jumlah_total'];

    protected function casts(): array
    {
        return ['jumlah_total' => 'integer'];
    }

    public function aset(): HasMany
    {
        return $this->hasMany(Aset::class);
    }
}
