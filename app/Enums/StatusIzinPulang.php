<?php

namespace App\Enums;

enum StatusIzinPulang: string
{
    case Diajukan = 'diajukan';
    case Disetujui = 'disetujui';
    case Ditolak = 'ditolak';
    case SedangIzin = 'sedang_izin';
    case Terlambat = 'terlambat';
    case SelesaiKembali = 'selesai_kembali';
}
