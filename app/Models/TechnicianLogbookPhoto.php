<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TechnicianLogbookPhoto extends BaseModel
{
    protected $fillable = ['logbook_id', 'path'];

    protected $hidden = ['path'];

    /** @return BelongsTo<TechnicianLogbook, $this> */
    public function logbook(): BelongsTo
    {
        return $this->belongsTo(TechnicianLogbook::class);
    }
}
