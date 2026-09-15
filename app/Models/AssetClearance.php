<?php

namespace App\Models;

use App\Enums\ClearanceStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** @property ClearanceStatus $status */
class AssetClearance extends BaseModel
{
    protected $fillable = ['checkout_request_id', 'status', 'catatan', 'cleared_by', 'cleared_at'];

    protected function casts(): array
    {
        return ['status' => ClearanceStatus::class, 'cleared_at' => 'datetime'];
    }

    /** @return BelongsTo<CheckoutRequest, $this> */
    public function checkoutRequest(): BelongsTo
    {
        return $this->belongsTo(CheckoutRequest::class);
    }

    /** @return BelongsTo<User, $this> */
    public function clearedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cleared_by');
    }
}
