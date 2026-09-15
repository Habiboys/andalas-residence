<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LaporanKerusakanAssignment extends BaseModel
{
    protected $fillable = ['laporan_kerusakan_id', 'technician_id', 'assigned_by', 'assigned_at', 'ended_at'];

    protected function casts(): array
    {
        return ['assigned_at' => 'datetime', 'ended_at' => 'datetime'];
    }

    /** @return BelongsTo<LaporanKerusakan, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(LaporanKerusakan::class, 'laporan_kerusakan_id');
    }

    /** @return BelongsTo<User, $this> */
    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    /** @return BelongsTo<User, $this> */
    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
