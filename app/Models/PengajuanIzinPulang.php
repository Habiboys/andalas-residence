<?php

namespace App\Models;

use App\Enums\StatusIzinPulang;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property Carbon|null $berangkat_pada
 * @property Carbon|null $kembali_pada
 * @property Carbon|null $rencana_kembali_pada
 */
class PengajuanIzinPulang extends BaseModel
{
    protected $table = 'pengajuan_izin_pulang';

    protected $fillable = [
        'mahasiswa_id', 'tanggal_mulai', 'tanggal_kembali', 'rencana_berangkat_pada',
        'rencana_kembali_pada', 'berangkat_pada', 'kembali_pada', 'ditandai_terlambat_pada',
        'alasan', 'tujuan_alamat', 'kontak_darurat', 'status', 'disetujui_oleh',
        'keberangkatan_dicatat_oleh', 'kepulangan_dicatat_oleh',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_mulai' => 'date',
            'tanggal_kembali' => 'date',
            'rencana_berangkat_pada' => 'datetime',
            'rencana_kembali_pada' => 'datetime',
            'berangkat_pada' => 'datetime',
            'kembali_pada' => 'datetime',
            'ditandai_terlambat_pada' => 'datetime',
            'status' => StatusIzinPulang::class,
        ];
    }

    /** @return BelongsTo<MahasiswaProfil, $this> */
    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }

    /** @return BelongsTo<User, $this> */
    public function penyetuju(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disetujui_oleh');
    }

    /** @return BelongsTo<User, $this> */
    public function pencatatKeberangkatan(): BelongsTo
    {
        return $this->belongsTo(User::class, 'keberangkatan_dicatat_oleh');
    }

    /** @return BelongsTo<User, $this> */
    public function pencatatKepulangan(): BelongsTo
    {
        return $this->belongsTo(User::class, 'kepulangan_dicatat_oleh');
    }

    public function isOverdue(): bool
    {
        return $this->berangkat_pada !== null
            && $this->kembali_pada === null
            && $this->rencana_kembali_pada?->isPast() === true;
    }
}
