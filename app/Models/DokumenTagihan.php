<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class DokumenTagihan extends BaseModel
{
    protected $table = 'dokumen_tagihan';

    protected $fillable = ['tagihan_id', 'pembayaran_tagihan_id', 'jenis', 'nomor', 'path', 'checksum_sha256', 'template_version', 'diterbitkan_pada'];

    protected function casts(): array
    {
        return ['diterbitkan_pada' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Dokumen tagihan bersifat immutable.'));
        static::deleting(fn () => throw new LogicException('Dokumen tagihan bersifat immutable.'));
    }

    /** @return BelongsTo<Tagihan, $this> */
    public function tagihan(): BelongsTo
    {
        return $this->belongsTo(Tagihan::class);
    }

    /** @return BelongsTo<PembayaranTagihan, $this> */
    public function pembayaran(): BelongsTo
    {
        return $this->belongsTo(PembayaranTagihan::class, 'pembayaran_tagihan_id');
    }
}
