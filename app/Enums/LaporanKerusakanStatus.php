<?php

namespace App\Enums;

enum LaporanKerusakanStatus: string
{
    case MenungguTriage = 'menunggu_triage';
    case Didisposisikan = 'didisposisikan';
    case SedangDikerjakan = 'sedang_dikerjakan';
    case Selesai = 'selesai';
    case Dibatalkan = 'dibatalkan';

    public function canTransitionTo(self $status): bool
    {
        return in_array($status, match ($this) {
            self::MenungguTriage => [self::Didisposisikan, self::Dibatalkan],
            self::Didisposisikan => [self::SedangDikerjakan, self::Dibatalkan],
            self::SedangDikerjakan => [self::Selesai, self::Dibatalkan],
            self::Selesai, self::Dibatalkan => [],
        }, true);
    }
}
