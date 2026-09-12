<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class City extends BaseModel
{
    protected $table = 'cities';

    protected $fillable = ['province_id', 'name'];

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }
}
