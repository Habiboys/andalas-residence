<?php

namespace App\Enums;

enum StatusIzinPulang: string
{
    case Diajukan = 'diajukan';
    case Ditolak = 'ditolak';
    case SedangIzin = 'sedang_izin';
    case SudahSampai = 'sudah_sampai';
    case SelesaiKembali = 'selesai_kembali';
}
