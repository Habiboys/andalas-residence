<?php

namespace App\Models;

use App\Enums\ResidenceRegistrationStatus;
use Database\Factories\ResidenceRegistrationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property Carbon|null $reservation_expires_at
 * @property Carbon|null $sponsor_approved_at
 * @property ResidenceRegistrationStatus $status
 */
class ResidenceRegistration extends BaseModel
{
    /** @use HasFactory<ResidenceRegistrationFactory> */
    use HasFactory;

    protected $fillable = [
        'stay_kind', 'ended_at',
        'student_profile_id',
        'periode_id',
        'status',
        'is_kipk',
        'submitted_at',
        'reviewed_by',
        'reviewed_at',
        'reserved_room_id', 'reservation_expires_at', 'starts_at', 'ends_at', 'rate_unit', 'funding', 'sponsor_name', 'sponsor_approved_at',
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

    /** @return BelongsTo<PenempatanKamar, $this> */
    public function placement(): BelongsTo
    {
        return $this->belongsTo(PenempatanKamar::class, 'penempatan_kamar_id');
    }

    /** @return BelongsTo<Tagihan, $this> */
    public function tagihan(): BelongsTo
    {
        return $this->belongsTo(Tagihan::class);
    }

    protected function casts(): array
    {
        return [
            'ended_at' => 'datetime',
            'status' => ResidenceRegistrationStatus::class,
            'is_kipk' => 'boolean',
            'reservation_expires_at' => 'datetime',
            'starts_at' => 'date',
            'ends_at' => 'date',
            'sponsor_approved_at' => 'datetime',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }
}
