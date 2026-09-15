<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PenanggungJawabAset extends BaseModel
{
    protected $table = 'penanggung_jawab_aset';

    protected $fillable = ['aset_id', 'user_id', 'mulai_pada', 'selesai_pada', 'catatan'];

    protected function casts(): array
    {
        return ['mulai_pada' => 'datetime', 'selesai_pada' => 'datetime'];
    }

    /** @return BelongsTo<Aset, $this> */
    public function aset(): BelongsTo
    {
        return $this->belongsTo(Aset::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
