<?php

namespace App\Models;

use Database\Factories\ResidenceDecisionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property array<string, mixed>|null $terms
 * @property Carbon|null $decided_at
 */
class ResidenceDecision extends BaseModel
{
    /** @use HasFactory<ResidenceDecisionFactory> */
    use HasFactory;

    protected $fillable = ['residence_registration_id', 'kind', 'status', 'reason', 'terms', 'requested_by', 'decided_by', 'decided_at'];

    protected function casts(): array
    {
        return ['terms' => 'array', 'decided_at' => 'datetime'];
    }

    /** @return BelongsTo<ResidenceRegistration, $this> */
    public function registration(): BelongsTo
    {
        return $this->belongsTo(ResidenceRegistration::class, 'residence_registration_id');
    }
}
