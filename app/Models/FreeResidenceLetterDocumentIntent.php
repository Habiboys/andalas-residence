<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FreeResidenceLetterDocumentIntent extends BaseModel
{
    protected $fillable = ['pengajuan_id', 'status', 'nomor', 'verification_token', 'signer_name', 'signer_nip', 'path', 'checksum_sha256', 'template_version', 'requested_at', 'generated_at', 'failure_reason'];

    protected function casts(): array
    {
        return ['requested_at' => 'datetime', 'generated_at' => 'datetime'];
    }

    /** @return BelongsTo<PengajuanBebasAsrama, $this> */
    public function pengajuan(): BelongsTo
    {
        return $this->belongsTo(PengajuanBebasAsrama::class, 'pengajuan_id');
    }
}
