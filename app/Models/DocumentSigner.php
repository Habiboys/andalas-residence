<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class DocumentSigner extends Model
{
    protected $fillable = ['nama', 'nip', 'jabatan', 'unit', 'aktif'];

    protected function casts(): array
    {
        return ['aktif' => 'boolean'];
    }

    /** @param Builder<$this> $query */
    public function scopeAktif(Builder $query): void
    {
        $query->where('aktif', true);
    }

    public static function aktif(): ?self
    {
        return static::query()->aktif()->latest('id')->first();
    }
}
