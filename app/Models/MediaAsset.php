<?php

namespace App\Models;

class MediaAsset extends BaseModel
{
    protected $fillable = ['path', 'name', 'mime_type', 'size', 'alt'];

    protected function casts(): array
    {
        return ['size' => 'integer'];
    }
}
