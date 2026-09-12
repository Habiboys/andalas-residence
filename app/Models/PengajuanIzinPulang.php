<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PengajuanIzinPulang extends BaseModel
{
    protected $table = 'pengajuan_izin_pulang';

    protected $fillable = [
        'mahasiswa_id', 'tanggal_mulai', 'tanggal_kembali', 'alasan',
        'tujuan_alamat', 'kontak_darurat', 'status', 'disetujui_oleh',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_mulai' => 'date',
            'tanggal_kembali' => 'date',
        ];
    }

    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }
}
