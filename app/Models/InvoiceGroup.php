<?php

namespace App\Models;

/**
 * @property array<string, mixed> $snapshot
 * @property list<string> $invoice_ids
 */
class InvoiceGroup extends BaseModel
{
    protected $fillable = ['nomor', 'payer_type', 'invoice_ids', 'snapshot', 'path', 'created_by'];

    protected function casts(): array
    {
        return ['invoice_ids' => 'array', 'snapshot' => 'array'];
    }
}
