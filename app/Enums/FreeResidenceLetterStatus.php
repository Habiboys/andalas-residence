<?php

namespace App\Enums;

enum FreeResidenceLetterStatus: string
{
    case Diajukan = 'diajukan';
    case Diverifikasi = 'diverifikasi';
    case Disetujui = 'disetujui';
    case Ditolak = 'ditolak';
}
