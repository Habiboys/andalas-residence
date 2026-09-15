<?php

namespace App\Enums;

enum ParentStudentRelationship: string
{
    case Father = 'father';
    case Mother = 'mother';
    case Guardian = 'guardian';
}
