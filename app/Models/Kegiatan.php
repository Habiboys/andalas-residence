<?php

namespace App\Models;

use App\Services\ResidenceBuildingAccess;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Kegiatan extends BaseModel
{
    protected $table = 'kegiatan';

    protected $fillable = [
        'judul', 'deskripsi', 'lokasi', 'tanggal_mulai', 'tanggal_selesai',
        'dibuat_oleh', 'gedung_id',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_mulai' => 'datetime',
            'tanggal_selesai' => 'datetime',
        ];
    }

    public function attendanceSessions(): HasMany
    {
        return $this->hasMany(AttendanceSession::class, 'kegiatan_id');
    }

    public function gedung(): BelongsTo
    {
        return $this->belongsTo(Gedung::class);
    }

    public function allowsFacilitator(User $user): bool
    {
        return $this->gedung_id === null || ResidenceBuildingAccess::allows($user, $this->gedung_id);
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
