<?php

namespace App\Models;

use App\Services\RoomEligibility;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property list<string>|null $allowed_categories
 * @property list<array{type: string, enabled: bool, max_capacity: int|null, facilities: string}>|null $room_types
 */
class Gedung extends BaseModel
{
    protected static function booted(): void
    {
        static::saving(function (Gedung $building): void {
            $building->gender_peruntukan = RoomEligibility::buildingGender($building);
        });
    }

    protected $table = 'gedung';

    protected $fillable = ['kode_gedung', 'nama_gedung', 'gender_peruntukan', 'alamat', 'deskripsi', 'foto', 'photos', 'allowed_categories', 'room_types'];

    protected function casts(): array
    {
        return ['photos' => 'array', 'allowed_categories' => 'array', 'room_types' => 'array'];
    }

    public function lantai(): HasMany
    {
        return $this->hasMany(Lantai::class);
    }

    public function fasilitasUmum(): HasMany
    {
        return $this->hasMany(FasilitasUmum::class);
    }
}
