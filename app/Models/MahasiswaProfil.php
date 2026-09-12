<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MahasiswaProfil extends BaseModel
{
    protected $table = 'mahasiswa_profil';

    protected $fillable = [
        'user_id', 'prodi_id', 'periode_id', 'city_id', 'angkatan',
        'barcode_code', 'nik', 'bpjs_path', 'riwayat_penyakit_path',
        'bukti_lulus_path', 'status_huni', 'tanggal_masuk',
    ];

    protected function casts(): array
    {
        return ['tanggal_masuk' => 'date'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function prodi(): BelongsTo
    {
        return $this->belongsTo(Prodi::class);
    }

    public function periode(): BelongsTo
    {
        return $this->belongsTo(Periode::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function penempatanKamar(): HasMany
    {
        return $this->hasMany(PenempatanKamar::class, 'mahasiswa_id');
    }

    public function pembayaran(): HasMany
    {
        return $this->hasMany(Pembayaran::class, 'mahasiswa_id');
    }

    public function checkin(): HasMany
    {
        return $this->hasMany(Checkin::class, 'mahasiswa_id');
    }

    public function absensiSholat(): HasMany
    {
        return $this->hasMany(AbsensiSholat::class, 'mahasiswa_id');
    }
}
