<?php

namespace App\Services;

use App\Enums\ClientProfileCategory;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\KipkRecipient;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class Residence2026StudentImport
{
    /** @return array<string, mixed> */
    public function read(): array
    {
        return json_decode(file_get_contents(database_path('seeders/data/residents-2026.json')), true, flags: JSON_THROW_ON_ERROR);
    }

    /**
     * Deduction amounts remain source evidence, not verified payments.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function apply(array $data): array
    {
        return DB::transaction(function () use ($data): array {
            $result = ['created' => 0, 'matched' => 0, 'skipped' => 0, 'kipk' => 0, 'pending_email' => 0, 'pending_prodi' => 0, 'placed' => 0, 'pending_rooms' => 0, 'warnings' => []];
            $role = Role::firstOrCreate(['name' => 'mahasiswa', 'guard_name' => 'web']);
            $sourceEmails = collect($data['students'])->pluck('email')->filter()->countBy();
            $programs = Prodi::where('jenjang', 'S1')->get()->groupBy(fn (Prodi $program): string => $this->normalize($program->name));
            $periods = Periode::where('nama_periode', '2026/2027')->get();
            if ($periods->count() > 1) {
                throw new \LogicException('Periode 2026/2027 duplikat; perbaiki sebelum impor.');
            }
            $period = $periods->first() ?? Periode::create([
                'nama_periode' => '2026/2027', 'status' => Periode::where('status', 'aktif')->exists() ? 'nonaktif' : 'aktif', 'angkatan_maba' => 2026,
                'tanggal_mulai' => '2026-08-01', 'tanggal_selesai' => '2027-07-31',
            ]);
            $rooms = Kamar::with('lantai.gedung')->get()->groupBy(fn (Kamar $room): string => $room->lantai->gedung->kode_gedung.'|'.$this->normalizeRoom($room->nomor_kamar));
            $sourceOccupancy = collect($data['students'])->flatMap(fn (array $student): array => $student['checkins'])
                ->concat(collect($data['unresolved'])->where('source', 'checkins'))
                ->groupBy(fn (array $row): string => $this->roomKey($row))
                ->map(fn ($rows): int => $rows->unique(fn (array $row): string => preg_match('/^2[456]\d{8}$/D', $row['nim'])
                    ? $row['nim'].'|'.$this->normalize($row['nama'] ?? '')
                    : $row['sheet'].':'.$row['row'])->count());
            foreach ($data['students'] as $record) {
                $nim = $record['nim'];
                if ($record['issues'] !== [] || ! preg_match('/^2[456]\d{8}$/D', $nim)
                    || (int) $record['angkatan'] !== (int) ('20'.substr($nim, 0, 2))
                    || ! in_array($record['category'], ['student', 'local_kipk', 'local_non_kipk'], true)) {
                    $result['skipped']++;
                    $result['warnings'][] = $nim.': perlu rekonsiliasi sumber ('.implode(', ', $record['issues']).').';

                    continue;
                }
                $user = User::where('nim_nip', $nim)->lockForUpdate()->first();
                $category = ClientProfileCategory::from($record['category']);
                if ($user && (! $user->hasRole('mahasiswa')
                    || $this->normalize($user->nama) !== $this->normalize($record['nama'])
                    || ($user->client_profile_category !== null && $user->client_profile_category !== $category))) {
                    $result['skipped']++;
                    $result['warnings'][] = $nim.': nama, peran, atau kategori akun yang ada berbeda; akun dipertahankan.';

                    continue;
                }
                $email = $record['email'];
                if ($email && $sourceEmails->get($email, 0) > 1) {
                    $email = null;
                    $result['warnings'][] = $nim.': email dipakai beberapa mahasiswa di sumber; gunakan akun impor nonaktif sampai dikoreksi.';
                }
                if (! $user && $email && (! filter_var($email, FILTER_VALIDATE_EMAIL) || User::where('email', $email)->exists())) {
                    $result['skipped']++;
                    $result['warnings'][] = $nim.': email tidak valid atau sudah digunakan akun lain.';

                    continue;
                }
                if (! $user) {
                    $placeholder = $nim.'@import.invalid';
                    if (! $email && User::where('email', $placeholder)->exists()) {
                        $result['skipped']++;
                        $result['warnings'][] = $nim.': alamat email impor sudah dipakai akun lain.';

                        continue;
                    }
                    $user = User::create([
                        'nim_nip' => $nim, 'nama' => $record['nama'],
                        'email' => $email ?: $placeholder,
                        'password' => Str::random(64), 'gender' => $record['gender'], 'no_hp' => $this->phone($record['checkins']),
                        'status' => $email ? 'aktif' : 'nonaktif',
                        'client_profile_category' => $category,
                    ]);
                    $user->assignRole($role);
                    $result['created']++;
                } else {
                    if ($user->client_profile_category === null) {
                        $user->update(['client_profile_category' => $category]);
                    }
                    $result['matched']++;
                }
                if (str_ends_with($user->email, '@import.invalid')) {
                    $result['pending_email']++;
                }
                $programIds = collect($record['prodi_names'])->flatMap(fn (string $name) => $programs->get($this->normalize($name), collect())->pluck('id'))->unique();
                $profile = MahasiswaProfil::firstOrCreate(['user_id' => $user->id], [
                    'angkatan' => (string) $record['angkatan'],
                    'prodi_id' => $programIds->count() === 1 ? $programIds->first() : null,
                    'barcode_code' => 'BC-'.Str::uuid(), 'status_huni' => 'calon',
                ]);
                if ($profile->angkatan !== null && (int) $profile->angkatan !== $record['angkatan']) {
                    throw new \LogicException($nim.': angkatan profil berbeda. Seluruh impor dibatalkan.');
                }
                $missing = [];
                if ($profile->angkatan === null) {
                    $missing['angkatan'] = (string) $record['angkatan'];
                }
                if ($profile->prodi_id === null && $programIds->count() === 1) {
                    $missing['prodi_id'] = $programIds->first();
                }
                if ($missing !== []) {
                    $profile->update($missing);
                }
                if ($profile->prodi_id === null) {
                    $result['pending_prodi']++;
                }
                if ($record['is_kipk']) {
                    KipkRecipient::firstOrCreate(['nim' => $nim, 'angkatan' => $record['angkatan']], ['nama' => $record['nama']]);
                    $result['kipk']++;
                }
                if ($record['checkins'] !== []) {
                    $key = $this->roomKey($record['checkins'][0]);
                    $candidates = $rooms->get($key, collect());
                    $room = $candidates->count() === 1 ? $candidates->first() : null;
                    if ($room === null || $sourceOccupancy->get($key, 0) > $room->kapasitas) {
                        $result['pending_rooms']++;
                        $result['warnings'][] = $nim.': kamar tidak cocok unik atau penghuni sumber melebihi kapasitas.';
                    } else {
                        $reason = $this->place($profile, $room, $period);
                        if ($reason !== null) {
                            $result['pending_rooms']++;
                            $result['warnings'][] = $nim.': '.$reason;
                        } else {
                            $result['placed']++;
                        }
                    }
                }
            }

            return $result;
        });
    }

    private function normalize(string $value): string
    {
        return preg_replace('/[^a-z0-9]/', '', Str::lower(Str::ascii($value)));
    }

    /** @param array<string, mixed> $row */
    private function roomKey(array $row): string
    {
        $codes = ['RPX(ADA KIPK)' => 'A', 'RUSUNAWA' => 'B', 'PUPERA PUTRI' => 'C', 'MENPERA' => 'D', 'RMS' => 'E', 'OREN' => 'F', 'HIJAU' => 'G', 'PUPERA PUTERA' => 'H'];

        return ($codes[$row['sheet']] ?? '?').'|'.$this->normalizeRoom($row['room']);
    }

    private function normalizeRoom(string $number): string
    {
        return preg_replace('/\s+/u', '', Str::upper($number));
    }

    /** @param list<array<string, mixed>> $checkins */
    private function phone(array $checkins): ?string
    {
        $phones = collect($checkins)->map(function (array $row): ?string {
            $number = preg_replace('/[\s()+-]/', '', $row['phone'] ?? '');
            if (preg_match('/^8\d{8,12}$/D', $number)) {
                $number = '0'.$number;
            }

            return preg_match('/^(?:08|62)\d{8,12}$/D', $number) ? $number : null;
        })->filter()->unique();

        return $phones->count() === 1 ? $phones->first() : null;
    }

    private function place(MahasiswaProfil $profile, Kamar $candidate, Periode $period): ?string
    {
        Gedung::whereKey($candidate->lantai->gedung_id)->lockForUpdate()->firstOrFail();
        $room = Kamar::whereKey($candidate->id)->lockForUpdate()->firstOrFail();
        $placements = $profile->penempatanKamar()->where('status', 'aktif')->get();
        if ($placements->count() === 1 && $placements->first()->kamar_id === $room->id && $placements->first()->periode_id === $period->id) {
            return null;
        }
        if ($profile->penempatanKamar()->exists() || $profile->status_huni !== 'calon') {
            return 'riwayat atau penempatan yang ada dipertahankan.';
        }
        if ($profile->residenceRegistrations()->exists()) {
            return 'pendaftaran yang ada harus direkonsiliasi terlebih dahulu.';
        }
        $gender = $candidate->lantai->gedung->gender_peruntukan;
        if ($gender !== 'campuran' && $profile->user->gender !== $gender) {
            return 'gender akun tidak sesuai gedung.';
        }
        $occupied = $room->penempatanKamar()->where('status', 'aktif')->count();
        $reserved = app(RoomReservations::class)->count($room);
        if ($room->status === 'maintenance' || $occupied + $reserved >= $room->kapasitas) {
            return 'kamar maintenance, penuh, atau sedang direservasi.';
        }
        PenempatanKamar::create([
            'mahasiswa_id' => $profile->id, 'kamar_id' => $room->id, 'periode_id' => $period->id,
            'tanggal_mulai' => $period->tanggal_mulai, 'status' => 'aktif',
            'catatan' => 'Impor check-in Excel 2026. Tanggal masuk disamakan dengan awal periode sebagai tanggal administratif, bukan tanggal check-in asli.',
        ]);
        $profile->update(['status_huni' => 'aktif', 'periode_id' => $period->id, 'tanggal_masuk' => $period->tanggal_mulai]);
        $occupied++;
        $room->update(['status' => $occupied + $reserved >= $room->kapasitas ? 'penuh' : 'terisi_sebagian']);

        return null;
    }
}
