<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PenempatanKamar extends BaseModel
{
    protected $table = 'penempatan_kamar';

    protected $fillable = [
        'mahasiswa_id', 'kamar_id', 'periode_id', 'tanggal_mulai',
        'tanggal_selesai', 'status', 'diproses_oleh', 'catatan',
    ];

    /** @return HasOne<ResidenceRegistration, $this> */
    public function registration(): HasOne
    {
        return $this->hasOne(ResidenceRegistration::class, 'penempatan_kamar_id');
    }

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
}
