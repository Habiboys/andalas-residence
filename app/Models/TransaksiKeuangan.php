<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransaksiKeuangan extends BaseModel
{
    protected $table = 'transaksi_keuangan';

    protected $fillable = [
        'nomor_bukti', 'kategori_id', 'pembayaran_mahasiswa_id', 'tipe',
        'nominal', 'deskripsi', 'tanggal_transaksi', 'nomor_spm_sp2d',
        'rincian_pajak', 'lampiran_path', 'dicatat_oleh',
    ];

    protected function casts(): array
    {
        return [
            'nominal' => 'decimal:2',
            'tanggal_transaksi' => 'date',
            'rincian_pajak' => 'array',
        ];
    }

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(KategoriTransaksi::class, 'kategori_id');
    }

    public function pembayaran(): BelongsTo
    {
        return $this->belongsTo(Pembayaran::class, 'pembayaran_mahasiswa_id');
    }

    public function pencatat(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dicatat_oleh');
    }
}
