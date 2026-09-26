<?php

namespace App\Models;

class ResidenceRate extends BaseModel
{
    protected $fillable = ['gedung_id', 'tipe_kamar', 'unit', 'amount'];
}
