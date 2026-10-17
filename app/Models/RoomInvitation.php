<?php

namespace App\Models;

use Database\Factories\RoomInvitationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomInvitation extends BaseModel
{
    /** @use HasFactory<RoomInvitationFactory> */
    use HasFactory;

    protected $fillable = ['residence_registration_id', 'sender_id', 'invitee_id', 'kamar_id', 'accepted_registration_id', 'status', 'expires_at', 'responded_at'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'responded_at' => 'datetime'];
    }

    public function registration(): BelongsTo
    {
        return $this->belongsTo(ResidenceRegistration::class, 'residence_registration_id');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Kamar::class, 'kamar_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function invitee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invitee_id');
    }
}
