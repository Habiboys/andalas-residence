<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DamageReportProgress extends BaseModel
{
    protected $table = 'damage_report_progress';

    protected $fillable = ['laporan_kerusakan_id', 'user_id', 'work_date', 'description', 'is_blocked', 'request_key', 'request_hash'];

    protected function casts(): array
    {
        return ['work_date' => 'date', 'is_blocked' => 'boolean'];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(LaporanKerusakan::class, 'laporan_kerusakan_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
