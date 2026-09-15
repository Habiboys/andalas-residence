<?php

namespace App\Models;

use App\Enums\ResidenceEvent;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResidenceHistory extends BaseModel
{
    protected $fillable = ['mahasiswa_id', 'event', 'occurred_at'];

    protected function casts(): array
    {
        return ['event' => ResidenceEvent::class, 'occurred_at' => 'datetime'];
    }

    /** @return BelongsTo<MahasiswaProfil, $this> */
    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }
}
