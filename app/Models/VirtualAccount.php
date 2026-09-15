<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VirtualAccount extends BaseModel
{
    protected $table = 'virtual_accounts';

    protected $fillable = ['mahasiswa_id', 'bank', 'nomor', 'atas_nama', 'aktif', 'berlaku_sampai'];

    protected function casts(): array
    {
        return ['aktif' => 'boolean', 'berlaku_sampai' => 'date'];
    }

    /** @return BelongsTo<MahasiswaProfil, $this> */
    public function mahasiswa(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'mahasiswa_id');
    }
}
