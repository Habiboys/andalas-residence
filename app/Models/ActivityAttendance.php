<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityAttendance extends BaseModel
{
    protected $fillable = ['attendance_session_id', 'mahasiswa_id', 'attendance_attempt_id', 'attended_at'];

    protected function casts(): array
    {
        return ['attended_at' => 'datetime'];
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

    /** @return BelongsTo<AttendanceAttempt, $this> */
    public function attempt(): BelongsTo
    {
        return $this->belongsTo(AttendanceAttempt::class, 'attendance_attempt_id');
    }
}
