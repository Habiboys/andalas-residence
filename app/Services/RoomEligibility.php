<?php

namespace App\Services;

use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

class RoomEligibility
{
    /** @return 'campur'|'laki_laki'|'perempuan' */
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
        $category = $user->client_profile_category?->value;
        if ($user->mahasiswaProfil && app(ResidenceLifecycle::class)->isLocal($user->mahasiswaProfil)) {
            $category = app(ResidenceLifecycle::class)->isKipk($user->mahasiswaProfil) ? 'local_kipk' : 'local_non_kipk';
            if (! app(ResidenceLifecycle::class)->isBinaan($user->mahasiswaProfil)) {
                $category = 'student';
            }
        }
        if ($user->mahasiswaProfil?->residenceRegistrations()->where('stay_kind', 'summer_course')->whereNull('ended_at')->where('status', 'accepted')->exists()) {
            $category = 'summer_course';
        }

        return in_array(self::buildingGender($building), ['campur', $user->gender], true)
            && ($building->allowed_categories === null || in_array($category, $building->allowed_categories, true));
    }

    public static function allowsType(Gedung $building, string $type, ?int $capacity = null): bool
    {
        if ($building->room_types === null) {
            return true;
        }
        $definition = collect($building->room_types)->firstWhere('type', $type);

        return ($definition['enabled'] ?? false)
            && ($capacity === null || $definition['max_capacity'] === null || $capacity <= $definition['max_capacity']);
    }

    /** @return Builder<Kamar> */
    public static function available(): Builder
    {
        return Kamar::whereIn('status', ['kosong', 'terisi_sebagian'])
            ->whereRaw('(select count(*) from penempatan_kamar where penempatan_kamar.kamar_id = kamar.id and penempatan_kamar.status = ?) < kamar.kapasitas', ['aktif'])
            ->with('lantai.gedung');
    }

    public static function validate(Kamar $room, User $user, string $field = 'kamar_id', ?string $registrationId = null): void
    {
        if (! $room->lantai?->gedung || ! self::allows($room->lantai->gedung, $user)) {
            throw ValidationException::withMessages([$field => 'Gedung tidak menerima kategori atau jenis kelamin penghuni Anda.']);
        }

        if (! self::allowsType($room->lantai->gedung, $room->tipe_kamar, $room->kapasitas)) {
            throw ValidationException::withMessages([$field => 'Tipe atau kapasitas kamar tidak sesuai master tipe gedung.']);
        }

        if ($room->status === 'maintenance' || $room->penempatanKamar()->where('status', 'aktif')->count() + app(RoomReservations::class)->count($room, $registrationId) >= $room->kapasitas) {
            throw ValidationException::withMessages([$field => 'Kamar tidak tersedia atau sudah penuh. Pilih kamar lain.']);
        }
    }
}
