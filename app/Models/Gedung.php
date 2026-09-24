<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Gedung extends BaseModel
{
    protected static function booted(): void
    {
        static::saving(function (Gedung $building): void {
            $building->gender_peruntukan = \App\Services\RoomEligibility::buildingGender($building);
        });
    }

    protected $table = 'gedung';

    protected $fillable = ['kode_gedung', 'nama_gedung', 'gender_peruntukan', 'alamat', 'deskripsi', 'foto'];

    public function lantai(): HasMany
    {
        return $this->hasMany(Lantai::class);
    }

    public function fasilitasUmum(): HasMany
    {
        return $this->hasMany(FasilitasUmum::class);
    }
}
