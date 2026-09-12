<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }

    public function kamar(): BelongsTo
    {
        return $this->belongsTo(Kamar::class);
    }

    public function periode(): BelongsTo
    {
        return $this->belongsTo(Periode::class);
    }
}
