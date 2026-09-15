<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LaporanKerusakanPhoto extends BaseModel
{
    protected $fillable = ['laporan_kerusakan_id', 'type', 'path', 'uploaded_by'];

    /** @return BelongsTo<LaporanKerusakan, $this> */
    public function report(): BelongsTo
    {
        return $this->belongsTo(LaporanKerusakan::class, 'laporan_kerusakan_id');
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
