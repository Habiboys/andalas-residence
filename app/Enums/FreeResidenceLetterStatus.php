<?php

namespace App\Enums;

enum FreeResidenceLetterStatus: string
{
    case Diajukan = 'diajukan';
    case Diverifikasi = 'verifikasi_aset_dan_keuangan';
    case Disetujui = 'disetujui';
    case Ditolak = 'ditolak';
}
