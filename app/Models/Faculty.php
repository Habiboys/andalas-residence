<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Faculty extends BaseModel
{
    protected $table = 'faculty';

    protected $fillable = ['name', 'code'];

    public function departemen(): HasMany
    {
        return $this->hasMany(Departemen::class);
    }
}
