<?php

namespace App\Enums;

enum TagihanStatus: string
{
    case Draft = 'draft';
    case Terbit = 'terbit';
    case Sebagian = 'sebagian';
    case Lunas = 'lunas';
    case Batal = 'batal';
}
