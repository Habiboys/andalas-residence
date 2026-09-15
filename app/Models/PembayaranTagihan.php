<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PembayaranTagihan extends BaseModel
{
    protected $table = 'pembayaran_tagihan';

    protected $fillable = ['referensi', 'mahasiswa_id', 'virtual_account_id', 'jumlah', 'dibayar_pada', 'status', 'metadata'];

    protected function casts(): array
    {
        return ['jumlah' => 'decimal:2', 'dibayar_pada' => 'datetime', 'metadata' => 'array'];
    }

    /** @return BelongsTo<MahasiswaProfil, $this> */
    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }

    /** @return BelongsTo<VirtualAccount, $this> */
    public function virtualAccount(): BelongsTo
    {
        return $this->belongsTo(VirtualAccount::class);
    }

    /** @return HasMany<AlokasiPembayaran, $this> */
    public function alokasi(): HasMany
    {
        return $this->hasMany(AlokasiPembayaran::class);
    }
}
