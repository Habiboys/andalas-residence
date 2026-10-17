<?php

namespace App\Models;

class OrganizationPosition extends BaseModel
{
    protected $fillable = ['parent_id', 'title', 'name', 'photo', 'sort_order', 'published'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer', 'published' => 'boolean'];
    }
}
