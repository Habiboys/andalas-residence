<?php

namespace App\Models;

/**
 * @property list<array{tagihan_id: string, jumlah: string|int|float}> $allocations
 */
class SponsorPayment extends BaseModel
{
    protected $fillable = ['reference', 'invoice_group_id', 'allocations', 'payer_type', 'recorded_by'];

    protected function casts(): array
    {
        return ['allocations' => 'array'];
    }
}
