<?php

namespace App\Enums;

enum LegacyFreeResidenceVerificationPath: string
{
    case AlumniPaid = 'alumni_paid';
    case AlumniUnpaid = 'alumni_unpaid';
    case NotAlumni = 'not_alumni';
}
