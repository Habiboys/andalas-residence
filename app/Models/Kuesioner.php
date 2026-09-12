<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Kuesioner extends BaseModel
{
    protected $table = 'kuesioner';

    protected $fillable = [
        'kode', 'nama', 'deskripsi', 'jenis', 'versi', 'status',
        'berlaku_mulai', 'berlaku_sampai', 'dibuat_oleh',
    ];

    protected function casts(): array
    {
        return [
            'berlaku_mulai' => 'date',
            'berlaku_sampai' => 'date',
        ];
    }

    public function pertanyaan(): HasMany
    {
        return $this->hasMany(KuesionerPertanyaan::class)->orderBy('urutan');
    }

    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dibuat_oleh');
    }
}
