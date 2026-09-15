<?php

namespace App\Enums;

enum RoomInspectionStatus: string
{
    case Menunggu = 'menunggu';
    case Berlangsung = 'berlangsung';
    case Selesai = 'selesai';
}
