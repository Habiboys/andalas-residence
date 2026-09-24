<?php

namespace App\Models;

class LegacyResidenceRate extends BaseModel
{
    protected $fillable = ['angkatan', 'jumlah'];

    protected function casts(): array
    {
        return ['angkatan' => 'integer', 'jumlah' => 'decimal:2'];
    }
}
