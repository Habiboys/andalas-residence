<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramSub extends BaseModel
{
    protected $table = 'program_subs';

    protected $fillable = ['program_id', 'judul', 'deskripsi', 'gambar', 'urutan'];

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }
}
