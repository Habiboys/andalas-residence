<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Program extends BaseModel
{
    protected $table = 'programs';

    protected $fillable = ['nama', 'deskripsi', 'ikon', 'urutan', 'published'];

    protected $casts = [
        'published' => 'boolean',
    ];

    public function sub(): HasMany
    {
        return $this->hasMany(ProgramSub::class)->orderBy('urutan');
    }
}
