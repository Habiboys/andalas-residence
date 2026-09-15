<?php

namespace App\Models;

use App\Enums\ClearanceStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property ClearanceStatus $status
 * @property numeric-string $outstanding_amount
 */
class FinanceClearance extends BaseModel
{
    protected $fillable = ['checkout_request_id', 'status', 'outstanding_amount', 'catatan', 'cleared_by', 'cleared_at'];

    protected function casts(): array
    {
        return ['status' => ClearanceStatus::class, 'outstanding_amount' => 'decimal:2', 'cleared_at' => 'datetime'];
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
