<?php

namespace App\Models;

use App\Enums\KondisiAset;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Aset extends BaseModel
{
    protected $table = 'aset';

    protected $fillable = [
        'stok_aset_id', 'jumlah',
        'kamar_id', 'fasilitas_umum_id', 'kode_inventaris',
        'nama_aset', 'kategori', 'kondisi', 'nilai_aset',
    ];

    protected function casts(): array
    {
        return [
            'jumlah' => 'integer',
            'kondisi' => KondisiAset::class,
            'nilai_aset' => 'decimal:2',
        ];
    }

    /** @param Builder<Aset> $query */
    public function scopeReportableFor(Builder $query, Kamar $room): void
    {
        $query->where(function (Builder $locations) use ($room): void {
            $locations->where('kamar_id', $room->id)
                ->orWhere(function (Builder $common) use ($room): void {
                    $common->whereNull('kamar_id')->whereHas('fasilitasUmum', function (Builder $facilities) use ($room): void {
                        $facilities->where('gedung_id', $room->lantai->gedung_id);
                    });
                });
        });
    }

    /** @return BelongsTo<Kamar, $this> */
    public function kamar(): BelongsTo
    {
        return $this->belongsTo(Kamar::class);
    }

    public function stokAset(): BelongsTo
    {
        return $this->belongsTo(StokAset::class);
    }

    /** @return BelongsTo<FasilitasUmum, $this> */
    public function fasilitasUmum(): BelongsTo
    {
        return $this->belongsTo(FasilitasUmum::class);
    }

    /** @return HasMany<LaporanKerusakan, $this> */
    public function laporanKerusakan(): HasMany
    {
        return $this->hasMany(LaporanKerusakan::class);
    }
}
