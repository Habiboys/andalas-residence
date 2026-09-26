<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Prodi extends BaseModel
{
    protected $table = 'prodi';

    protected $fillable = ['departemen_id', 'name', 'jenjang', 'code'];

    /** @return BelongsTo<Departemen, $this> */
    public function departemen(): BelongsTo
    {
        return $this->belongsTo(Departemen::class);
    }

    /** @return HasMany<MahasiswaProfil, $this> */
    public function mahasiswaProfil(): HasMany
    {
        return $this->hasMany(MahasiswaProfil::class);
    }
}
