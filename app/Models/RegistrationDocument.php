<?php

namespace App\Models;

use Database\Factories\RegistrationDocumentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property Carbon|null $reviewed_at
 */
class RegistrationDocument extends BaseModel
{
    /** @use HasFactory<RegistrationDocumentFactory> */
    use HasFactory;

    protected $fillable = ['residence_registration_id', 'kind', 'version', 'path', 'checksum', 'status', 'uploaded_by', 'reviewed_by', 'reviewed_at', 'notes'];

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    protected function casts(): array
    {
        return ['version' => 'integer', 'reviewed_at' => 'datetime'];
    }

    /** @return BelongsTo<ResidenceRegistration, $this> */
    public function registration(): BelongsTo
    {
        return $this->belongsTo(ResidenceRegistration::class, 'residence_registration_id');
    }
}
