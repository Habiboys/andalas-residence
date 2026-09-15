<?php

namespace App\Policies;

use App\Models\ParentStudentLink;
use App\Models\User;

class ParentStudentLinkPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('children.view');
    }

    public function view(User $user, ParentStudentLink $parentStudentLink): bool
    {
        return $user->can('children.view')
            && $parentStudentLink->parent_user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, ParentStudentLink $parentStudentLink): bool
    {
        return false;
    }

    public function delete(User $user, ParentStudentLink $parentStudentLink): bool
    {
        return false;
    }

    public function restore(User $user, ParentStudentLink $parentStudentLink): bool
    {
        return false;
    }

    public function forceDelete(User $user, ParentStudentLink $parentStudentLink): bool
    {
        return false;
    }
}
