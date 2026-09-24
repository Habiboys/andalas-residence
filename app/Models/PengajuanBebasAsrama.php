<?php

namespace App\Models;

use App\Enums\FreeResidenceLetterStatus;
use App\Enums\LegacyFreeResidenceVerificationPath;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property FreeResidenceLetterStatus $status
 * @property LegacyFreeResidenceVerificationPath|null $legacy_verification_path
 * @property-read CheckoutRequest|null $checkoutRequest
 */
class PengajuanBebasAsrama extends BaseModel
{
    protected $table = 'pengajuan_bebas_asrama';

    protected $fillable = [
        'nomor_pengajuan', 'nomor_surat_resmi', 'mahasiswa_id', 'alasan',
        'status', 'catatan_penolakan', 'disetujui_oleh', 'file_surat_path',
        'lifecycle_year', 'legacy_verification_path', 'checkout_request_id',
        'payment_evidence_path', 'bank_statement_path', 'tagihan_id', 'verified_at', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => FreeResidenceLetterStatus::class,
            'legacy_verification_path' => LegacyFreeResidenceVerificationPath::class,
            'verified_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function tagihan(): BelongsTo
    {
        return $this->belongsTo(Tagihan::class);
    }

    /** @return BelongsTo<MahasiswaProfil, $this> */
    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }

    /** @return BelongsTo<CheckoutRequest, $this> */
    public function checkoutRequest(): BelongsTo
    {
        return $this->belongsTo(CheckoutRequest::class);
    }

    /** @return HasMany<PengajuanBebasAsramaStatusHistory, $this> */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(PengajuanBebasAsramaStatusHistory::class, 'pengajuan_id');
    }

    /** @return HasOne<FreeResidenceLetterDocumentIntent, $this> */
    public function documentIntent(): HasOne
    {
        return $this->hasOne(FreeResidenceLetterDocumentIntent::class, 'pengajuan_id');
    }
}
