<?php

namespace App\Models;

use Database\Factories\RoomInvitationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property Carbon $expires_at
 * @property Carbon|null $responded_at
 */
class RoomInvitation extends BaseModel
{
    /** @use HasFactory<RoomInvitationFactory> */
    use HasFactory;

    protected $fillable = ['residence_registration_id', 'sender_id', 'invitee_id', 'kamar_id', 'accepted_registration_id', 'status', 'expires_at', 'responded_at'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'responded_at' => 'datetime'];
    }

    /** @return BelongsTo<ResidenceRegistration, $this> */
    public function registration(): BelongsTo
    {
        return $this->belongsTo(ResidenceRegistration::class, 'residence_registration_id');
    }

    /** @return BelongsTo<Kamar, $this> */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Kamar::class, 'kamar_id');
    }

    /** @return BelongsTo<User, $this> */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /** @return BelongsTo<User, $this> */
    public function invitee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invitee_id');
    }
}
