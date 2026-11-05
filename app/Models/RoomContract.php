<?php

namespace App\Models;

use Database\Factories\RoomContractFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property list<string> $members
 * @property Carbon|null $approved_at
 */
class RoomContract extends BaseModel
{
    /** @use HasFactory<RoomContractFactory> */
    use HasFactory;

    protected $fillable = ['kamar_id', 'occupants', 'total', 'members', 'approved_by', 'approved_at'];

    protected function casts(): array
    {
        return ['members' => 'array', 'occupants' => 'integer', 'total' => 'decimal:2', 'approved_at' => 'datetime'];
    }

    /** @return HasMany<ResidenceRegistration, $this> */
    public function registrations(): HasMany
    {
        return $this->hasMany(ResidenceRegistration::class, 'room_contract_id');
    }
}
