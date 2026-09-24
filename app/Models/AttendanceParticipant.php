<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceParticipant extends BaseModel
{
    protected $fillable = ['attendance_session_id', 'mahasiswa_id', 'floor', 'room'];

    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }
}
