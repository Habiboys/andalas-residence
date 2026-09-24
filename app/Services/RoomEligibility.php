<?php

namespace App\Services;

use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

class RoomEligibility
{
    public static function buildingGender(Gedung $building): string
    {
        return match (strtoupper(trim($building->kode_gedung))) {
            'A', 'B', 'C', 'D', 'E' => 'perempuan',
            'F', 'G', 'H' => 'laki_laki',
            'NAKES', 'ASN' => 'campur',
            default => $building->gender_peruntukan ?? 'campur',
        };
    }

    public static function allows(Gedung $building, User $user): bool
    {
        return in_array(self::buildingGender($building), ['campur', $user->gender], true);
    }

    /** @return Builder<Kamar> */
    public static function available(): Builder
    {
        return Kamar::whereIn('status', ['kosong', 'terisi_sebagian'])
            ->whereRaw('(select count(*) from penempatan_kamar where penempatan_kamar.kamar_id = kamar.id and penempatan_kamar.status = ?) < kamar.kapasitas', ['aktif'])
            ->with('lantai.gedung');
    }

    public static function validate(Kamar $room, User $user, string $field = 'kamar_id'): void
    {
        if (! $room->lantai?->gedung || ! self::allows($room->lantai->gedung, $user)) {
            throw ValidationException::withMessages([$field => 'Gedung kamar tidak sesuai jenis kelamin penghuni. A–E untuk perempuan, F–H untuk laki-laki, Nakes dan ASN untuk keduanya.']);
        }

        if ($room->status === 'maintenance' || $room->penempatanKamar()->where('status', 'aktif')->count() >= $room->kapasitas) {
            throw ValidationException::withMessages([$field => 'Kamar tidak tersedia atau sudah penuh. Pilih kamar lain.']);
        }
    }
}
