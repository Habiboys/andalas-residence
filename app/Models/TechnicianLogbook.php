<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TechnicianLogbook extends BaseModel
{
    protected $fillable = ['user_id', 'work_date', 'description', 'source', 'gedung_id', 'request_key', 'request_hash'];

    protected $hidden = ['request_hash', 'request_key'];

    protected function casts(): array
    {
        return ['work_date' => 'date'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<TechnicianLogbookPhoto, $this> */
    public function photos(): HasMany
    {
        return $this->hasMany(TechnicianLogbookPhoto::class, 'logbook_id');
    }
}
