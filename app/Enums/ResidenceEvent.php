<?php

namespace App\Enums;

enum ResidenceEvent: string
{
    case Entered = 'entered';
    case CheckedOut = 'checked_out';
    case Reentered = 'reentered';
}
