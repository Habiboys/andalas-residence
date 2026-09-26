<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string|null $code
 */
class Faculty extends BaseModel
{
    protected $table = 'faculty';

    protected $fillable = ['name', 'code'];

    /** @return HasMany<Departemen, $this> */
    public function departemen(): HasMany
    {
        return $this->hasMany(Departemen::class);
    }
}
