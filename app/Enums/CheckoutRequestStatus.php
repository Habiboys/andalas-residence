<?php

namespace App\Enums;

enum CheckoutRequestStatus: string
{
    case Diajukan = 'diajukan';
    case Diproses = 'diproses';
    case SiapCheckout = 'siap_checkout';
    case Selesai = 'selesai';
    case Ditolak = 'ditolak';
}
