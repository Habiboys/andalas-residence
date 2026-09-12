<?php

namespace App\Models;

class Informasi extends BaseModel
{
    protected $table = 'informasis';

    protected $fillable = ['kategori', 'judul', 'konten', 'tanggal', 'file', 'published'];

    protected $casts = [
        'tanggal' => 'date',
        'published' => 'boolean',
    ];

    public const KATEGORI = ['regulasi', 'sop', 'panduan', 'pengumuman'];
}
