<?php

namespace App\Models;

class DamageReportComplaint extends BaseModel
{
    protected $fillable = ['laporan_kerusakan_id', 'item_id', 'user_id', 'reason', 'status', 'request_key'];

    protected $hidden = ['request_key'];
}
