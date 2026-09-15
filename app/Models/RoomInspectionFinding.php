<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomInspectionFinding extends BaseModel
{
    protected $fillable = ['room_inspection_id', 'aset_id', 'laporan_kerusakan_id', 'description', 'severity', 'estimated_cost'];

    protected function casts(): array
    {
        return ['estimated_cost' => 'decimal:2'];
    }

    /** @return BelongsTo<RoomInspection, $this> */
    public function inspection(): BelongsTo
    {
        return $this->belongsTo(RoomInspection::class, 'room_inspection_id');
    }

    /** @return BelongsTo<Aset, $this> */
    public function aset(): BelongsTo
    {
        return $this->belongsTo(Aset::class);
    }

    /** @return BelongsTo<LaporanKerusakan, $this> */
    public function damageReport(): BelongsTo
    {
        return $this->belongsTo(LaporanKerusakan::class, 'laporan_kerusakan_id');
    }
}
