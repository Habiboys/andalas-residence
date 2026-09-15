<?php

namespace App\Models;

use App\Enums\ParentStudentRelationship;
use Database\Factories\ParentStudentLinkFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParentStudentLink extends BaseModel
{
    /** @use HasFactory<ParentStudentLinkFactory> */
    use HasFactory;

    protected $fillable = [
        'parent_user_id',
        'student_profile_id',
        'relationship',
        'is_primary_contact',
    ];

    /** @return BelongsTo<User, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    /** @return BelongsTo<MahasiswaProfil, $this> */
    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(MahasiswaProfil::class, 'student_profile_id');
    }

    protected function casts(): array
    {
        return [
            'relationship' => ParentStudentRelationship::class,
            'is_primary_contact' => 'boolean',
        ];
    }
}
