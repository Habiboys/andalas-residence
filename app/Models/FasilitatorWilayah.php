<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FasilitatorWilayah extends BaseModel
{
    protected $table = 'fasilitator_wilayah';

    protected $fillable = ['user_id', 'gedung_id'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function gedung(): BelongsTo
    {
        return $this->belongsTo(Gedung::class);
    }
}
