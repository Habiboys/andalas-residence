<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResidenceDocumentTemplate extends BaseModel
{
    protected $fillable = [
        'category',
        'kind',
        'original_name',
        'path',
        'mime_type',
        'uploaded_by',
    ];

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
