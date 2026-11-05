<?php

namespace App\Models;

/**
 * @property array<string, mixed> $snapshot
 * @property list<string> $invoice_ids
 */
class InvoiceGroup extends BaseModel
{
    protected $fillable = ['residence_application_id', 'sent_at', 'delivery_status', 'delivered_at', 'delivery_failed_at', 'nomor', 'payer_type', 'invoice_ids', 'snapshot', 'path', 'created_by'];

    protected function casts(): array
    {
        return ['sent_at' => 'datetime', 'delivered_at' => 'datetime', 'delivery_failed_at' => 'datetime', 'invoice_ids' => 'array', 'snapshot' => 'array'];
    }
}
