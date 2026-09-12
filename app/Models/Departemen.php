<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Departemen extends BaseModel
{
    protected $table = 'departemen';

    protected $fillable = ['faculty_id', 'name'];

    public function faculty(): BelongsTo
    {
        return $this->belongsTo(Faculty::class);
    }

    public function prodi(): HasMany
    {
        return $this->hasMany(Prodi::class);
    }
}
