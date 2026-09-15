<?php

namespace App\Enums;

enum AttendanceRejectionReason: string
{
    case SessionNotOpen = 'session_not_open';
    case TokenInvalid = 'token_invalid';
    case TokenExpired = 'token_expired';
    case Ineligible = 'ineligible';
    case LocationInaccurate = 'location_inaccurate';
    case OutsideRadius = 'outside_radius';
    case Duplicate = 'duplicate';
}
