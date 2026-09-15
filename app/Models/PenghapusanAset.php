<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PenghapusanAset extends BaseModel
{
    protected $table = 'penghapusan_aset';

    protected $fillable = ['aset_id', 'disetujui_oleh', 'metode', 'alasan', 'nilai_realisasi', 'dihapuskan_pada'];

    protected function casts(): array
    {
        return ['nilai_realisasi' => 'decimal:2', 'dihapuskan_pada' => 'datetime'];
    }

    /** @return BelongsTo<Aset, $this> */
    public function aset(): BelongsTo
    {
        return $this->belongsTo(Aset::class);
    }

    /** @return BelongsTo<User, $this> */
    public function penyetuju(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disetujui_oleh');
    }
}
