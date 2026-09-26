<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentNumberSequence extends Model
{
    protected $fillable = ['tipe', 'tahun', 'nomor_terakhir'];

    protected function casts(): array
    {
        return ['tahun' => 'integer', 'nomor_terakhir' => 'integer'];
    }
}
