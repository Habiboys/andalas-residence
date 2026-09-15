<?php

namespace App\Models;

use App\Enums\TagihanStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property TagihanStatus $status
 */
class Tagihan extends BaseModel
{
    protected $table = 'tagihan';

    protected $fillable = ['nomor', 'mahasiswa_id', 'status', 'mata_uang', 'tanggal_terbit', 'jatuh_tempo', 'subtotal', 'total_penyesuaian', 'total', 'total_dibayar'];

    protected function casts(): array
    {
        return [
            'status' => TagihanStatus::class,
            'tanggal_terbit' => 'date',
            'jatuh_tempo' => 'date',
            'subtotal' => 'decimal:2',
            'total_penyesuaian' => 'decimal:2',
            'total' => 'decimal:2',
            'total_dibayar' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<MahasiswaProfil, $this> */
    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }

    /** @return HasMany<TagihanItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(TagihanItem::class);
    }

    /** @return HasMany<TagihanPenyesuaian, $this> */
    public function penyesuaian(): HasMany
    {
        return $this->hasMany(TagihanPenyesuaian::class);
    }

    /** @return HasMany<JadwalCicilan, $this> */
    public function jadwalCicilan(): HasMany
    {
        return $this->hasMany(JadwalCicilan::class);
    }

    /** @return HasMany<AlokasiPembayaran, $this> */
    public function alokasiPembayaran(): HasMany
    {
        return $this->hasMany(AlokasiPembayaran::class);
    }

    /** @return HasMany<DokumenTagihan, $this> */
    public function dokumen(): HasMany
    {
        return $this->hasMany(DokumenTagihan::class);
    }
}
