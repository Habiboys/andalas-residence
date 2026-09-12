<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Province extends BaseModel
{
    protected $table = 'provinces';

    protected $fillable = ['name'];

    public function cities(): HasMany
    {
        return $this->hasMany(City::class);
    }
}
