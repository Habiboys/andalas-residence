<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomInspectionChecklistItem extends BaseModel
{
    protected $fillable = ['room_inspection_id', 'item', 'condition', 'catatan'];

    /** @return BelongsTo<RoomInspection, $this> */
    public function inspection(): BelongsTo
    {
        return $this->belongsTo(RoomInspection::class, 'room_inspection_id');
    }
}
