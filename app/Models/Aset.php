<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Aset extends BaseModel
{
    protected $table = 'aset';

    protected $fillable = [
        'kamar_id', 'fasilitas_umum_id', 'kode_inventaris', 'kode_gudang',
        'nama_aset', 'kategori', 'kondisi', 'nilai_aset', 'tanggal_pengadaan',
    ];

    protected function casts(): array
    {
        return [
            'nilai_aset' => 'decimal:2',
            'tanggal_pengadaan' => 'date',
        ];
    }

    public function kamar(): BelongsTo
    {
        return $this->belongsTo(Kamar::class);
    }

    public function fasilitasUmum(): BelongsTo
    {
        return $this->belongsTo(FasilitasUmum::class);
    }

    public function laporanKerusakan(): HasMany
    {
        return $this->hasMany(LaporanKerusakan::class);
    }
}
