<?php

namespace App\Models;

use App\Enums\ResidenceRegistrationStatus;
use Database\Factories\ResidenceRegistrationStatusHistoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResidenceRegistrationStatusHistory extends BaseModel
{
    /** @use HasFactory<ResidenceRegistrationStatusHistoryFactory> */
    use HasFactory;

    protected $fillable = [
        'residence_registration_id',
        'from_status',
        'to_status',
        'changed_by',
        'notes',
    ];

    /** @return BelongsTo<ResidenceRegistration, $this> */
    public function residenceRegistration(): BelongsTo
    {
        return $this->belongsTo(ResidenceRegistration::class);
    }

    /** @return BelongsTo<User, $this> */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    protected function casts(): array
    {
        return [
            'from_status' => ResidenceRegistrationStatus::class,
            'to_status' => ResidenceRegistrationStatus::class,
        ];
    }
}
