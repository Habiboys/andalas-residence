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
 * @property Carbon|null $ready_at
 * @property Carbon|null $checked_in_at
 * @property Carbon|null $keys_returned_at
 * @property Carbon|null $kipk_disbursed_at
 * @property Carbon|null $completed_at
 * @property Carbon|null $ended_at
 * @property ResidenceRegistrationStatus $status
 */
class ResidenceRegistration extends BaseModel
{
    /** @use HasFactory<ResidenceRegistrationFactory> */
    use HasFactory;

    protected $fillable = [
        'stay_kind', 'ended_at', 'billing_basis',
        'workflow_version', 'residence_policy_id', 'residence_application_id', 'room_contract_id', 'allocation_status', 'ready_at', 'checked_in_at', 'checked_in_by', 'keys_returned_at', 'keys_returned_by', 'return_condition', 'end_notified_at', 'kipk_disbursed_at', 'kipk_due_at', 'historical_evidence', 'historical_confirmed_at', 'historical_confirmed_by', 'sponsor_limit',
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

    /** @return BelongsTo<Kamar, $this> */
    public function reservedRoom(): BelongsTo
    {
        return $this->belongsTo(Kamar::class, 'reserved_room_id');
    }

    /** @return BelongsTo<Tagihan, $this> */
    public function tagihan(): BelongsTo
    {
        return $this->belongsTo(Tagihan::class);
    }

    /** @return BelongsTo<ResidencePolicy, $this> */
    public function policy(): BelongsTo
    {
        return $this->belongsTo(ResidencePolicy::class, 'residence_policy_id');
    }

    /** @return BelongsTo<ResidenceApplication, $this> */
    public function application(): BelongsTo
    {
        return $this->belongsTo(ResidenceApplication::class, 'residence_application_id');
    }

    /** @return HasMany<RegistrationDocument, $this> */
    public function documents(): HasMany
    {
        return $this->hasMany(RegistrationDocument::class);
    }

    /** @return HasMany<ResidenceDecision, $this> */
    public function decisions(): HasMany
    {
        return $this->hasMany(ResidenceDecision::class);
    }

    /** @return BelongsTo<RoomContract, $this> */
    public function roomContract(): BelongsTo
    {
        return $this->belongsTo(RoomContract::class);
    }

    protected function casts(): array
    {
        return [
            'ended_at' => 'datetime',
            'workflow_version' => 'integer', 'ready_at' => 'datetime', 'checked_in_at' => 'datetime', 'keys_returned_at' => 'datetime', 'end_notified_at' => 'datetime', 'kipk_disbursed_at' => 'datetime', 'kipk_due_at' => 'date', 'historical_confirmed_at' => 'datetime', 'sponsor_limit' => 'decimal:2',
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
