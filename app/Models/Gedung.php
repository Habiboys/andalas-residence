<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Gedung extends BaseModel
{
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
