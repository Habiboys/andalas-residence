<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceSession extends BaseModel
{
    protected $fillable = [
        'kegiatan_id', 'facilitator_id', 'qr_token_hash', 'opens_at', 'expires_at', 'closed_at',
        'anchor_latitude', 'anchor_longitude', 'radius_meters', 'maximum_accuracy_meters',
    ];

    protected function casts(): array
    {
        return [
            'opens_at' => 'datetime',
            'expires_at' => 'datetime',
            'closed_at' => 'datetime',
            'anchor_latitude' => 'float',
            'anchor_longitude' => 'float',
            'radius_meters' => 'integer',
            'maximum_accuracy_meters' => 'integer',
        ];
    }

    /** @return BelongsTo<Kegiatan, $this> */
    public function kegiatan(): BelongsTo
    {
        return $this->belongsTo(Kegiatan::class);
    }

    /** @return BelongsTo<User, $this> */
    public function facilitator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'facilitator_id');
    }

    /** @return HasMany<AttendanceAttempt, $this> */
    public function attempts(): HasMany
    {
        return $this->hasMany(AttendanceAttempt::class);
    }

    /** @return HasMany<ActivityAttendance, $this> */
    public function attendances(): HasMany
    {
        return $this->hasMany(ActivityAttendance::class);
    }
}
