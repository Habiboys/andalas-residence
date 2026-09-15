<?php

namespace App\Models;

use App\Enums\FreeResidenceLetterStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PengajuanBebasAsramaStatusHistory extends BaseModel
{
    protected $table = 'pengajuan_bebas_asrama_status_histories';

    protected $fillable = ['pengajuan_id', 'status', 'changed_by', 'note'];

    protected function casts(): array
    {
        return ['status' => FreeResidenceLetterStatus::class];
    }

    /** @return BelongsTo<PengajuanBebasAsrama, $this> */
    public function pengajuan(): BelongsTo
    {
        return $this->belongsTo(PengajuanBebasAsrama::class, 'pengajuan_id');
    }

    /** @return BelongsTo<User, $this> */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
