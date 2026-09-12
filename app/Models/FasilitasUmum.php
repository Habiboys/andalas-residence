<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FasilitasUmum extends BaseModel
{
    protected $table = 'fasilitas_umum';

    protected $fillable = ['gedung_id', 'lantai_id', 'nama_fasilitas', 'kategori', 'kondisi'];

    public function gedung(): BelongsTo
    {
        return $this->belongsTo(Gedung::class);
    }

    public function lantai(): BelongsTo
    {
        return $this->belongsTo(Lantai::class);
    }
}
