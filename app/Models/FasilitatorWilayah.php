<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FasilitatorWilayah extends BaseModel
{
    protected $table = 'fasilitator_wilayah';

    protected $fillable = ['user_id', 'gedung_id'];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Gedung, $this> */
    public function gedung(): BelongsTo
    {
        return $this->belongsTo(Gedung::class);
    }
}
