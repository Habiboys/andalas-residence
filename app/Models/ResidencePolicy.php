<?php

namespace App\Models;

use Database\Factories\ResidencePolicyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Carbon;

/**
 * @property array{open: bool, building_ids: list<string>, documents: list<string>, month_days: int, day_basis: string, monthly_allowed: bool, rates: list<array{gedung_id: string, type: string, unit: string, amount: numeric-string|int|float, room_amount?: numeric-string|int|float|null}>} $settings
 * @property int $version
 * @property Carbon|null $published_at
 */
class ResidencePolicy extends BaseModel
{
    /** @use HasFactory<ResidencePolicyFactory> */
    use HasFactory;

    protected $fillable = ['category', 'version', 'settings', 'published_at', 'created_by'];

    protected function casts(): array
    {
        return ['settings' => 'array', 'version' => 'integer', 'published_at' => 'datetime'];
    }
}
