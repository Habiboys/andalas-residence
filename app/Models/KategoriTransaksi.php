<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KategoriTransaksi extends BaseModel
{
    protected $table = 'kategori_transaksi';

    protected $fillable = ['nama_kategori', 'tipe', 'kode_rekening'];

    public function transaksi(): HasMany
    {
        return $this->hasMany(TransaksiKeuangan::class, 'kategori_id');
    }
}
