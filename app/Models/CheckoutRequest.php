<?php

namespace App\Models;

use App\Enums\CheckoutRequestStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property CheckoutRequestStatus $status
 * @property-read RoomInspection|null $inspection
 * @property-read AssetClearance|null $assetClearance
 * @property-read FinanceClearance|null $financeClearance
 */
class CheckoutRequest extends BaseModel
{
    protected $fillable = [
        'mahasiswa_id', 'penempatan_kamar_id', 'status', 'alasan', 'diajukan_at',
        'disetujui_at', 'selesai_at', 'diproses_oleh',
    ];

    protected function casts(): array
    {
        return [
            'status' => CheckoutRequestStatus::class,
            'diajukan_at' => 'datetime',
            'disetujui_at' => 'datetime',
            'selesai_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<MahasiswaProfil, $this> */
    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class);
    }

    /** @return BelongsTo<PenempatanKamar, $this> */
    public function placement(): BelongsTo
    {
        return $this->belongsTo(PenempatanKamar::class, 'penempatan_kamar_id');
    }

    /** @return BelongsTo<User, $this> */
    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'diproses_oleh');
    }

    /** @return HasOne<RoomInspection, $this> */
    public function inspection(): HasOne
    {
        return $this->hasOne(RoomInspection::class);
    }

    /** @return HasOne<AssetClearance, $this> */
    public function assetClearance(): HasOne
    {
        return $this->hasOne(AssetClearance::class);
    }

    /** @return HasOne<FinanceClearance, $this> */
    public function financeClearance(): HasOne
    {
        return $this->hasOne(FinanceClearance::class);
    }
}
