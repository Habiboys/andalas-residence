<?php

namespace App\Models;

class JenisKegiatan extends BaseModel
{
    protected $table = 'jenis_kegiatan';

    protected $fillable = ['nama', 'is_other'];

    protected function casts(): array
    {
        return ['is_other' => 'boolean'];
    }
}
