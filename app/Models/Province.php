<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Province extends BaseModel
{
    protected $table = 'provinces';

    protected $fillable = ['name', 'wilayah_code'];

    public function cities(): HasMany
    {
        return $this->hasMany(City::class);
    }
}
