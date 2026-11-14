<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property Carbon|null $returned_at
 */
class ResidenceCashRefund extends BaseModel
{
    protected $table = 'residence_cash_refunds';

    protected $fillable = [
        'residence_registration_id',
        'tagihan_id',
        'amendment_id',
        'amount',
        'status',
        'recipient_name',
        'returned_at',
        'returned_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'returned_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<ResidenceRegistration, $this> */
    public function registration(): BelongsTo
    {
        return $this->belongsTo(ResidenceRegistration::class, 'residence_registration_id');
    }

    /** @return BelongsTo<Tagihan, $this> */
    public function tagihan(): BelongsTo
    {
        return $this->belongsTo(Tagihan::class, 'tagihan_id');
    }

    /** @return BelongsTo<User, $this> */
    public function officer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'returned_by');
    }
}
