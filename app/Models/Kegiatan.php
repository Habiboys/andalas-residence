<?php

namespace App\Models;

use App\Services\ResidenceBuildingAccess;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Kegiatan extends BaseModel
{
    protected $table = 'kegiatan';

    protected $fillable = [
        'judul', 'deskripsi', 'tanggal_mulai', 'tanggal_selesai',
        'dibuat_oleh', 'gedung_id', 'jenis_kegiatan_id',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_mulai' => 'datetime',
            'tanggal_selesai' => 'datetime',
        ];
    }

    public function attendanceSession(): HasOne
    {
        return $this->hasOne(AttendanceSession::class, 'kegiatan_id');
    }

    public function gedung(): BelongsTo
    {
        return $this->belongsTo(Gedung::class);
    }

    public function allowsFacilitator(User $user): bool
    {
        return ResidenceBuildingAccess::allows($user, $this->gedung_id);
    }

    public function allowsStudent(MahasiswaProfil $student): bool
    {
        return $this->gedung_id === null || $student->penempatanKamar()->where('status', 'aktif')
            ->whereHas('kamar.lantai', fn ($query) => $query->where('gedung_id', $this->gedung_id))->exists();
    }

    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dibuat_oleh');
    }
}
