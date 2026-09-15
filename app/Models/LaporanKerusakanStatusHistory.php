<?php

namespace App\Models;

use App\Enums\LaporanKerusakanStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LaporanKerusakanStatusHistory extends BaseModel
{
    protected $fillable = ['laporan_kerusakan_id', 'from_status', 'to_status', 'changed_by', 'description'];

    protected function casts(): array
    {
        return [
            'from_status' => LaporanKerusakanStatus::class,
            'to_status' => LaporanKerusakanStatus::class,
        ];
    }

    /** @return BelongsTo<LaporanKerusakan, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(LaporanKerusakan::class, 'laporan_kerusakan_id');
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
