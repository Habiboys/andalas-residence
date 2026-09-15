<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class KategoriAset extends BaseModel
{
    protected $table = 'kategori_aset';

    protected $fillable = ['kode', 'nama'];

    /** @return HasMany<Aset, $this> */
    public function aset(): HasMany
    {
        return $this->hasMany(Aset::class);
    }
}
