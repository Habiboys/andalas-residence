<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Periode extends BaseModel
{
    protected $table = 'periode';

    protected $fillable = ['nama_periode', 'status', 'tanggal_mulai', 'tanggal_selesai', 'angkatan_maba', 'reservation_hours'];

    protected function casts(): array
    {
        return [
            'angkatan_maba' => 'integer',
            'reservation_hours' => 'integer',
            'tanggal_mulai' => 'date',
            'tanggal_selesai' => 'date',
        ];
    }

    /** @return HasMany<MahasiswaProfil, $this> */
    public function mahasiswaProfil(): HasMany
    {
        return $this->hasMany(MahasiswaProfil::class);
    }

    /** @return HasMany<ResidenceRegistration, $this> */
    public function residenceRegistrations(): HasMany
    {
        return $this->hasMany(ResidenceRegistration::class);
    }
}
