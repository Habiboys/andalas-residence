<?php

namespace App\Models;

use App\Enums\ResidenceRegistrationStatus;
use Database\Factories\ResidenceRegistrationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property ResidenceRegistrationStatus $status
 */
class ResidenceRegistration extends BaseModel
{
    /** @use HasFactory<ResidenceRegistrationFactory> */
    use HasFactory;

    protected $fillable = [
        'student_profile_id',
        'periode_id',
        'status',
        'is_kipk',
        'submitted_at',
        'reviewed_by',
        'reviewed_at',
        'notes', 'tagihan_id', 'completed_at', 'penempatan_kamar_id',
    ];

    /** @return BelongsTo<MahasiswaProfil, $this> */
    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'student_profile_id');
    }

    /** @return BelongsTo<Periode, $this> */
    public function periode(): BelongsTo
    {
        return $this->belongsTo(Periode::class);
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /** @return HasMany<RoomPreference, $this> */
    public function roomPreferences(): HasMany
    {
        return $this->hasMany(RoomPreference::class);
    }

    /** @return HasMany<ResidenceRegistrationStatusHistory, $this> */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(ResidenceRegistrationStatusHistory::class);
    }

    public function placement(): BelongsTo
    {
        return $this->belongsTo(PenempatanKamar::class, 'penempatan_kamar_id');
    }

    public function tagihan(): BelongsTo
    {
        return $this->belongsTo(Tagihan::class);
    }

    protected function casts(): array
    {
        return [
            'status' => ResidenceRegistrationStatus::class,
            'is_kipk' => 'boolean',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }
}
