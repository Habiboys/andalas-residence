<?php

namespace App\Enums;

enum ClientProfileCategory: string
{
    case Student = 'student';
    case Parent = 'parent';
    case LocalKipk = 'local_kipk';
    case LocalNonKipk = 'local_non_kipk';
    case LocalResident = 'local_resident';
    case InternationalStudent = 'international_student';
    case InternationalFreeFacility = 'international_free_facility';
    case NonStudent = 'non_student';
}
