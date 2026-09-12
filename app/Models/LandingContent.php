<?php

namespace App\Models;

class LandingContent extends BaseModel
{
    protected $table = 'landing_contents';

    protected $fillable = ['key', 'title', 'content', 'image', 'urutan', 'published'];

    protected $casts = [
        'published' => 'boolean',
    ];
}
