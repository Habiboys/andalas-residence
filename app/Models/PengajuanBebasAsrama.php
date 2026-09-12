<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PengajuanBebasAsrama extends BaseModel
{
    protected $table = 'pengajuan_bebas_asrama';

    protected $fillable = [
        'nomor_pengajuan', 'nomor_surat_resmi', 'mahasiswa_id', 'alasan',
        'status', 'catatan_penolakan', 'disetujui_oleh', 'file_surat_path',
    ];

    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }
}
