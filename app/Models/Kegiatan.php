<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Kegiatan extends BaseModel
{
    protected $table = 'kegiatan';

    protected $fillable = [
        'judul', 'deskripsi', 'lokasi', 'tanggal_mulai', 'tanggal_selesai',
        'target_role', 'dibuat_oleh',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_mulai' => 'datetime',
            'tanggal_selesai' => 'datetime',
            'target_role' => 'array',
        ];
    }

    public function partisipan(): HasMany
    {
        return $this->hasMany(KegiatanPartisipan::class);
    }

    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dibuat_oleh');
    }
}
