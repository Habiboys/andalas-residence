<?php

namespace App\Enums;

enum ClearanceStatus: string
{
    case Menunggu = 'menunggu';
    case Disetujui = 'disetujui';
    case Ditolak = 'ditolak';
}
