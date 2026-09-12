<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AbsensiSholat extends BaseModel
{
    protected $table = 'absensi_sholat';

    protected $fillable = [
        'mahasiswa_id', 'waktu_sholat', 'tanggal', 'waktu_scan', 'discan_oleh', 'metode',
    ];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'waktu_scan' => 'datetime',
        ];
    }

    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }

    public function scanner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'discan_oleh');
    }
}
