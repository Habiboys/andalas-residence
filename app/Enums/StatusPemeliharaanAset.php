<?php

namespace App\Enums;

enum StatusPemeliharaanAset: string
{
    case Dijadwalkan = 'dijadwalkan';
    case Berlangsung = 'berlangsung';
    case Selesai = 'selesai';
    case Dibatalkan = 'dibatalkan';
}
