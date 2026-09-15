<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PenempatanKamar extends BaseModel
{
    protected $table = 'penempatan_kamar';

    protected $fillable = [
        'mahasiswa_id', 'kamar_id', 'periode_id', 'tanggal_mulai',
        'tanggal_selesai', 'metode', 'status', 'diproses_oleh', 'catatan',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_mulai' => 'date',
            'tanggal_selesai' => 'date',
        ];
    }

    /** @return BelongsTo<MahasiswaProfil, $this> */
    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }

    /** @return BelongsTo<Kamar, $this> */
    public function kamar(): BelongsTo
    {
        return $this->belongsTo(Kamar::class);
    }

    /** @return BelongsTo<Periode, $this> */
    public function periode(): BelongsTo
    {
        return $this->belongsTo(Periode::class);
    }

    /** @return HasMany<CheckoutRequest, $this> */
    public function checkoutRequests(): HasMany
    {
        return $this->hasMany(CheckoutRequest::class);
    }

    /** @return HasMany<Checkin, $this> */
    public function checkins(): HasMany
    {
        return $this->hasMany(Checkin::class);
    }
}
