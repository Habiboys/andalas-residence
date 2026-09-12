<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Faculty extends BaseModel
{
    protected $table = 'faculty';

    protected $fillable = ['name'];

    public function departemen(): HasMany
    {
        return $this->hasMany(Departemen::class);
    }
}
