<?php

namespace App\Models;

use Database\Factories\ResidencePaymentReferenceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Carbon;

/**
 * @property list<array{tagihan_id: string, jumlah: string, payment_proof_id?: string|null}>|null $allocations
 * @property Carbon $paid_at
 * @property Carbon|null $matched_at
 */
class ResidencePaymentReference extends BaseModel
{
    /** @use HasFactory<ResidencePaymentReferenceFactory> */
    use HasFactory;

    protected $fillable = ['reference', 'source', 'evidence_path', 'paid_at', 'amount', 'payer_type', 'status', 'allocations', 'recorded_by', 'matched_at'];

    protected function casts(): array
    {
        return ['allocations' => 'array', 'amount' => 'decimal:2', 'paid_at' => 'date', 'matched_at' => 'datetime'];
    }
}
