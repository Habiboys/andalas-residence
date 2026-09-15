<?php

namespace App\Enums;

enum StatusPesananLayanan: string
{
    case Diajukan = 'diajukan';
    case Diproses = 'diproses';
    case Selesai = 'selesai';
    case Dibatalkan = 'dibatalkan';
}
