<?php

namespace App\Models;

class Testimoni extends BaseModel
{
    protected $table = 'testimonis';

    protected $fillable = ['nama', 'prodi', 'teks', 'foto', 'urutan', 'published'];
}
