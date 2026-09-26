<?php

namespace App\Models;

class LegacyResident extends BaseModel
{
    protected $fillable = ['nim', 'nama', 'angkatan', 'gedung_id', 'checked_out_at', 'notes', 'recorded_by'];

    protected function casts(): array
    {
        return ['angkatan' => 'integer', 'checked_out_at' => 'date'];
    }
}
