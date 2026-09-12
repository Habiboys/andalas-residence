<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Periode extends BaseModel
{
    protected $table = 'periode';

    protected $fillable = ['nama_periode', 'status', 'tanggal_mulai', 'tanggal_selesai'];

    protected function casts(): array
    {
        return [
            'tanggal_mulai' => 'date',
            'tanggal_selesai' => 'date',
        ];
    }

    public function mahasiswaProfil(): HasMany
    {
        return $this->hasMany(MahasiswaProfil::class);
    }
}
