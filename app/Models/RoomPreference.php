<?php

namespace App\Models;

use Database\Factories\RoomPreferenceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomPreference extends BaseModel
{
    /** @use HasFactory<RoomPreferenceFactory> */
    use HasFactory;

    protected $fillable = [
        'residence_registration_id',
        'kamar_id',
        'priority',
        'room_type',
        'notes',
    ];

    /** @return BelongsTo<ResidenceRegistration, $this> */
    public function residenceRegistration(): BelongsTo
    {
        return $this->belongsTo(ResidenceRegistration::class);
    }

    /** @return BelongsTo<Kamar, $this> */
    public function kamar(): BelongsTo
    {
        return $this->belongsTo(Kamar::class);
    }

    protected function casts(): array
    {
        return ['priority' => 'integer'];
    }
}
