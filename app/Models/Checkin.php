<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Checkin extends BaseModel
{
    protected $table = 'checkin';

    protected $fillable = [
        'mahasiswa_id', 'periode_id', 'tanggal_rencana_masuk',
        'tanggal_aktual_checkin', 'status', 'petugas_checkin_id',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_rencana_masuk' => 'date',
            'tanggal_aktual_checkin' => 'datetime',
        ];
    }

    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }

    public function pembayaran(): HasMany
    {
        return $this->hasMany(Pembayaran::class);
    }
}
