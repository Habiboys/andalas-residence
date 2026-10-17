<?php

namespace App\Models;

class RoomType extends BaseModel
{
    protected $fillable = ['code', 'name', 'active'];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }
}
