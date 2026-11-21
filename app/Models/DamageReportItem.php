<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DamageReportItem extends BaseModel
{
    protected $fillable = ['laporan_kerusakan_id', 'aset_id', 'reported_by', 'description', 'location_label', 'completed_at', 'completed_by', 'completion_note', 'legacy', 'is_new'];

    protected function casts(): array
    {
        return ['completed_at' => 'datetime', 'legacy' => 'boolean', 'is_new' => 'boolean'];
    }

    /** @return BelongsTo<LaporanKerusakan, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(LaporanKerusakan::class, 'laporan_kerusakan_id');
    }

    /** @return BelongsTo<User, $this> */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    /** @return HasMany<LaporanKerusakanPhoto, $this> */
    public function photos(): HasMany
    {
        return $this->hasMany(LaporanKerusakanPhoto::class, 'item_id');
    }
}
