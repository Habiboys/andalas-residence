<?php

namespace App\Models;

class ResidenceRate extends BaseModel
{
    public const DEFAULT_CATEGORY = 'default';

    protected $fillable = ['gedung_id', 'category', 'tipe_kamar', 'unit', 'amount', 'student_amount', 'room_amount', 'facilities'];
}
