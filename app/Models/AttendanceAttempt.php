<?php

namespace App\Models;

use App\Enums\AttendanceRejectionReason;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AttendanceAttempt extends BaseModel
{
    protected $fillable = [
        'attendance_session_id', 'mahasiswa_id', 'attempted_at', 'latitude', 'longitude',
        'accuracy_meters', 'distance_meters', 'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'attempted_at' => 'datetime',
            'latitude' => 'float',
            'longitude' => 'float',
            'accuracy_meters' => 'float',
            'distance_meters' => 'float',
            'rejection_reason' => AttendanceRejectionReason::class,
        ];
    }

    /** @return BelongsTo<AttendanceSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'attendance_session_id');
    }

    /** @return BelongsTo<MahasiswaProfil, $this> */
    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }

    /** @return HasOne<ActivityAttendance, $this> */
    public function attendance(): HasOne
    {
        return $this->hasOne(ActivityAttendance::class);
    }
}
