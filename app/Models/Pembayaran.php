<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pembayaran extends BaseModel
{
    protected $table = 'pembayaran';

    protected $fillable = [
        'kode_transaksi', 'tagihan_id', 'mahasiswa_id', 'jenis_pembayaran',
        'nominal', 'termin_ke', 'metode_pembayaran', 'nama_bank',
        'nomor_rekening_pengirim', 'atas_nama_pengirim', 'bukti_transfer_path',
        'status', 'diverifikasi_oleh', 'catatan_verifikasi', 'tanggal_bayar',
    ];

    protected function casts(): array
    {
        return [
            'nominal' => 'decimal:2',
            'tanggal_bayar' => 'datetime',
        ];
    }

    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }

    public function tagihan(): BelongsTo
    {
        return $this->belongsTo(Tagihan::class);
    }

    public function verifikator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'diverifikasi_oleh');
    }
}
