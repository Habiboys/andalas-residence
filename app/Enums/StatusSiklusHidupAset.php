<?php

namespace App\Enums;

enum StatusSiklusHidupAset: string
{
    case Aktif = 'aktif';
    case DalamPemeliharaan = 'dalam_pemeliharaan';
    case TidakDigunakan = 'tidak_digunakan';
    case Dihapuskan = 'dihapuskan';
}
