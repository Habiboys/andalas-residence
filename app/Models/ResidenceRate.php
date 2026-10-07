<?php

namespace App\Models;

class ResidenceRate extends BaseModel
{
    protected $fillable = ['gedung_id', 'tipe_kamar', 'unit', 'amount', 'student_amount', 'room_amount', 'facilities'];
}
