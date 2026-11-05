<?php

namespace App\Models;

use Database\Factories\ResidenceApplicationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property Carbon $starts_at
 * @property Carbon $ends_at
 * @property Carbon|null $approved_at
 */
class ResidenceApplication extends BaseModel
{
    /** @use HasFactory<ResidenceApplicationFactory> */
    use HasFactory;

    protected $fillable = ['number', 'kind', 'institution', 'recipient_email', 'letter_path', 'starts_at', 'ends_at', 'funding', 'approved_at', 'approved_by', 'created_by'];

    protected function casts(): array
    {
        return ['starts_at' => 'date', 'ends_at' => 'date', 'approved_at' => 'datetime'];
    }

    /** @return HasMany<ResidenceRegistration, $this> */
    public function registrations(): HasMany
    {
        return $this->hasMany(ResidenceRegistration::class, 'residence_application_id');
    }
}
