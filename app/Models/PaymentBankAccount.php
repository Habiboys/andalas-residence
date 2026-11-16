<?php

namespace App\Models;

class PaymentBankAccount extends BaseModel
{
    protected $table = 'payment_bank_accounts';

    protected $fillable = [
        'bank_name',
        'account_number',
        'account_name',
        'instructions',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
