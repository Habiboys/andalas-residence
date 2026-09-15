<?php

namespace App\Enums;

enum SumberPenyesuaianTagihan: string
{
    case KipkSponsor = 'kipk_sponsor';
    case SubsidiInternasionalGratis = 'subsidi_internasional_gratis';
    case Manual = 'manual';
}
