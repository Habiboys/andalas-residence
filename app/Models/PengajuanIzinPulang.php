<?php

namespace App\Models;

use App\Enums\StatusIzinPulang;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property StatusIzinPulang $status
 * @property string|null $dokumen_path
 * @property string|null $sampai_foto_path
 * @property string|null $kembali_foto_path
 * @property Carbon $tanggal_mulai
 * @property Carbon $tanggal_kembali
 * @property Carbon|null $berangkat_pada
 * @property Carbon|null $kembali_pada
 * @property Carbon|null $rencana_kembali_pada
 */
class PengajuanIzinPulang extends BaseModel
{
    protected $table = 'pengajuan_izin_pulang';

    protected $fillable = [
        'mahasiswa_id', 'tanggal_mulai', 'tanggal_kembali',
        'rencana_kembali_pada', 'berangkat_pada', 'kembali_pada',
        'alasan', 'tujuan_alamat', 'kontak_darurat', 'status', 'disetujui_oleh',
        'jenis', 'gedung_id', 'dokumen_path', 'catatan_verifikasi', 'sampai_pada',
        'sampai_foto_path', 'sampai_latitude', 'sampai_longitude', 'sampai_accuracy',
        'kembali_foto_path', 'kembali_latitude', 'kembali_longitude', 'kembali_accuracy',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_mulai' => 'date',
            'tanggal_kembali' => 'date',
            'rencana_kembali_pada' => 'datetime',
            'berangkat_pada' => 'datetime',
            'kembali_pada' => 'datetime',
            'status' => StatusIzinPulang::class,
            'sampai_pada' => 'datetime',
        ];
    }

    /** @return BelongsTo<MahasiswaProfil, $this> */
    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }

    /** @return BelongsTo<Gedung, $this> */
    public function gedung(): BelongsTo
    {
        return $this->belongsTo(Gedung::class);
    }

    /** @return BelongsTo<User, $this> */
    public function penyetuju(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disetujui_oleh');
    }

    public function isOverdue(): bool
    {
        return $this->berangkat_pada !== null
            && $this->kembali_pada === null
            && $this->rencana_kembali_pada?->isPast() === true;
    }
}
