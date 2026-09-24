<?php

namespace App\Models;

use App\Enums\RoomInspectionStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property RoomInspectionStatus $status
 */
class RoomInspection extends BaseModel
{
    protected $fillable = ['checkout_request_id', 'inspector_id', 'status', 'catatan', 'asset_checks', 'inspected_at'];

    protected function casts(): array
    {
        return ['status' => RoomInspectionStatus::class, 'asset_checks' => 'array', 'inspected_at' => 'datetime'];
    }

    /** @return BelongsTo<CheckoutRequest, $this> */
    public function checkoutRequest(): BelongsTo
    {
        return $this->belongsTo(CheckoutRequest::class);
    }

    /** @return BelongsTo<User, $this> */
    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<RoomInspectionFinding, $this> */
    public function findings(): HasMany
    {
        return $this->hasMany(RoomInspectionFinding::class);
    }
}
