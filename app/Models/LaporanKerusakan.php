<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class LaporanKerusakan extends BaseModel
{
    protected $table = 'laporan_kerusakan';

    protected $fillable = [
        'nomor_tiket', 'aset_id', 'kamar_id', 'dilaporkan_oleh', 'teknisi_id',
        'deskripsi', 'foto_sebelum', 'foto_sesudah', 'metode_penanganan',
        'biaya_riil', 'status', 'tanggal_lapor', 'tanggal_selesai', 'catatan_penyelesaian',
    ];

    protected function casts(): array
    {
        return [
            'biaya_riil' => 'decimal:2',
            'tanggal_lapor' => 'datetime',
            'tanggal_selesai' => 'datetime',
        ];
    }

    public function aset(): BelongsTo
    {
        return $this->belongsTo(Aset::class);
    }

    public function kamar(): BelongsTo
    {
        return $this->belongsTo(Kamar::class);
    }

    public function pelapor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dilaporkan_oleh');
    }

    public function teknisi(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teknisi_id');
    }

    public function penilaian(): HasOne
    {
        return $this->hasOne(PenilaianTeknisi::class);
    }
}
