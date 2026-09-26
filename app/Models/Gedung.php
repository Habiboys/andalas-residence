<?php

namespace App\Models;

use App\Services\RoomEligibility;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property list<string>|null $allowed_categories
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

    protected $fillable = ['kode_gedung', 'nama_gedung', 'gender_peruntukan', 'alamat', 'deskripsi', 'foto', 'allowed_categories'];

    protected function casts(): array
    {
        return ['allowed_categories' => 'array'];
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
