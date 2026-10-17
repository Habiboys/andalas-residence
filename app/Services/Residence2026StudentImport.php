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
use Closure;
use Illuminate\Support\Collection;
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
    public function apply(array $data, ?Closure $onProgress = null): array
    {
        return DB::transaction(function () use ($data, $onProgress): array {
            $result = ['created' => 0, 'matched' => 0, 'skipped' => 0, 'kipk' => 0, 'pending_email' => 0, 'pending_prodi' => 0, 'placed' => 0, 'pending_rooms' => 0, 'room_issues' => [], 'program_issues' => [], 'room_diagnostics' => [], 'warnings' => []];
            $role = Role::firstOrCreate(['name' => 'mahasiswa', 'guard_name' => 'web']);
            $sourceEmails = collect($data['students'])->pluck('email')->filter()->countBy();
            $matching = app(Residence2026StudentMatching::class);
            $programs = Prodi::whereIn('jenjang', ['S1', 'D3', 'D4'])->get();
            $periods = Periode::where('nama_periode', '2026/2027')->get();
            if ($periods->count() > 1) {
                throw new \LogicException('Periode 2026/2027 duplikat; perbaiki sebelum impor.');
            }
            $period = $periods->first() ?? Periode::create([
                'nama_periode' => '2026/2027', 'status' => Periode::where('status', 'aktif')->exists() ? 'nonaktif' : 'aktif', 'angkatan_maba' => 2026,
                'tanggal_mulai' => '2026-08-01', 'tanggal_selesai' => '2027-07-31',
            ]);
            $rooms = Kamar::with('lantai.gedung')->get()->groupBy(fn (Kamar $room): string => $matching->roomKey($room->lantai->gedung->kode_gedung, $room->nomor_kamar));
            $sourceOccupancy = $this->sourceOccupancy($data, $rooms, $matching);
            $processed = 0;
            $total = count($data['students']);
            $onProgress?->__invoke(0, $total);
            foreach ($data['students'] as $record) {
                try {
                    $nim = $record['nim'];
                    if ($record['issues'] !== [] || ! preg_match('/^2[456]\d{8}$/D', $nim)
                        || (int) $record['angkatan'] !== (int) ('20'.substr($nim, 0, 2))
                        || ! in_array($record['category'], ['student', 'local_kipk', 'local_non_kipk'], true)) {
                        $result['skipped']++;
                        $labels = ['name_mismatch' => 'nama berbeda untuk NIM yang sama', 'multiple_rooms' => 'NIM tercatat pada beberapa kamar', 'kipk_status_conflict' => 'status KIP-K bertentangan', 'category_unconfirmed' => 'kategori belum terkonfirmasi', 'special_status_needs_review' => 'status khusus perlu diperiksa'];
                        $details = array_map(fn (string $issue): string => $labels[$issue] ?? $issue, $record['issues']);
                        $locations = array_map(fn (array $row): string => $row['sheet'].' baris '.$row['row'], $record['checkins']);
                        $result['warnings'][] = $nim.': ditunda karena '.implode('; ', $details).'. Sumber: '.implode(', ', $locations).'.';

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
                    $programIds = $matching->programs($record['prodi_names'], $programs)->pluck('id');
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
                        $reason = $record['prodi_names'] === [] ? 'missing_source' : ($programIds->count() > 1 ? 'ambiguous' : 'unknown_name');
                        $result['program_issues'][$reason] = ($result['program_issues'][$reason] ?? 0) + 1;
                    }
                    if ($record['is_kipk']) {
                        KipkRecipient::firstOrCreate(['nim' => $nim, 'angkatan' => $record['angkatan']], ['nama' => $record['nama']]);
                        $result['kipk']++;
                    }
                    if ($record['checkins'] !== []) {
                        $source = $record['checkins'][0];
                        $candidates = $matching->rooms($source, $rooms);
                        $room = $candidates->count() === 1 ? $candidates->first() : null;
                        $occupants = $room ? count($sourceOccupancy[$room->id] ?? []) : null;
                        $reason = null;
                        if ($candidates->isEmpty()) {
                            $reason = 'missing_master';
                            $message = 'nomor kamar tidak ditemukan pada master gedung ini.';
                        } elseif ($candidates->count() > 1) {
                            $reason = 'ambiguous_alias';
                            $message = 'alias nomor kamar menunjuk lebih dari satu kamar master.';
                        } elseif ($occupants > $room->kapasitas) {
                            $reason = 'over_capacity';
                            $message = 'penghuni sumber '.$occupants.' orang, kapasitas master '.$room->kapasitas.'.';
                        } else {
                            $message = $this->place($profile, $room, $period, $source);
                            $reason = $message !== null ? 'existing_state' : null;
                        }
                        if ($reason !== null) {
                            $result['pending_rooms']++;
                            $result['room_issues'][$reason] = ($result['room_issues'][$reason] ?? 0) + 1;
                            $result['room_diagnostics'][] = [
                                'nim' => $nim, 'sheet' => $source['sheet'], 'row' => $source['row'],
                                'source_room' => $source['room'], 'reason' => $reason,
                                'source_occupants' => $occupants, 'capacity' => $room?->kapasitas,
                            ];
                            $result['warnings'][] = $nim.': '.$source['sheet'].' baris '.$source['row'].' / '.$source['room'].': '.$message;
                        } else {
                            $result['placed']++;
                        }
                    }
                } finally {
                    $processed++;
                    if ($processed % 50 === 0 || $processed === $total) {
                        $onProgress?->__invoke($processed, $total);
                    }
                }
            }

            return $result;
        });
    }

    /**
     * Simulate matching against current masters without creating users, profiles or placements.
     * Existing accounts, bookings and payment state are checked only during the actual import.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function simulate(array $data): array
    {
        $matching = app(Residence2026StudentMatching::class);
        $rooms = Kamar::with('lantai.gedung')->get()->groupBy(fn (Kamar $room): string => $matching->roomKey($room->lantai->gedung->kode_gedung, $room->nomor_kamar));
        $programs = Prodi::whereIn('jenjang', ['S1', 'D3', 'D4'])->get();
        $occupancy = $this->sourceOccupancy($data, $rooms, $matching);
        $report = ['ready' => 0, 'skipped' => 0, 'room_matches' => 0, 'room_issues' => [], 'program_matches' => 0, 'program_issues' => [], 'room_diagnostics' => [], 'program_diagnostics' => [], 'source_issues' => [], 'unresolved_rows' => count($data['unresolved'])];
        foreach ($data['students'] as $record) {
            if ($record['issues'] !== []) {
                $report['skipped']++;
                $report['source_issues'][] = ['nim' => $record['nim'], 'issues' => $record['issues'], 'checkins' => $record['checkins'], 'kipk_deductions' => $record['kipk_deductions']];

                continue;
            }
            $report['ready']++;
            $matches = $matching->programs($record['prodi_names'], $programs);
            if ($matches->count() === 1) {
                $report['program_matches']++;
            } else {
                $reason = $record['prodi_names'] === [] ? 'missing_source' : ($matches->count() > 1 ? 'ambiguous' : 'unknown_name');
                $report['program_issues'][$reason] = ($report['program_issues'][$reason] ?? 0) + 1;
                $report['program_diagnostics'][] = ['nim' => $record['nim'], 'source_names' => $record['prodi_names'], 'reason' => $reason, 'candidates' => $matches->map(fn (Prodi $program): array => ['name' => $program->name, 'degree' => $program->jenjang])->all()];
            }
            if ($record['checkins'] === []) {
                continue;
            }
            $row = $record['checkins'][0];
            $matches = $matching->rooms($row, $rooms);
            $room = $matches->count() === 1 ? $matches->first() : null;
            $count = $room ? count($occupancy[$room->id] ?? []) : null;
            $reason = match (true) {
                $matches->isEmpty() => 'missing_master',
                $matches->count() > 1 => 'ambiguous_alias',
                $count > $room->kapasitas => 'over_capacity',
                $room->status === 'maintenance' => 'maintenance',
                default => null,
            };
            if ($reason === null) {
                $report['room_matches']++;
            } else {
                $report['room_issues'][$reason] = ($report['room_issues'][$reason] ?? 0) + 1;
                $report['room_diagnostics'][] = ['nim' => $record['nim'], 'sheet' => $row['sheet'], 'row' => $row['row'], 'source_room' => $row['room'], 'reason' => $reason, 'source_occupants' => $count, 'capacity' => $room?->kapasitas];
            }
        }

        return $report;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  Collection<string, Collection<int, Kamar>>  $rooms
     * @return array<string, array<string, bool>>
     */
    private function sourceOccupancy(array $data, Collection $rooms, Residence2026StudentMatching $matching): array
    {
        $occupancy = [];
        $sourceRows = collect($data['students'])->flatMap(fn (array $student): array => $student['checkins'])
            ->concat(collect($data['unresolved'])->where('source', 'checkins'));
        foreach ($sourceRows as $row) {
            $identity = preg_match('/^2[456]\d{8}$/D', $row['nim'])
                ? $row['nim'].'|'.$this->normalize($row['nama'] ?? '')
                : $row['sheet'].':'.$row['row'];
            foreach ($matching->rooms($row, $rooms) as $candidate) {
                $occupancy[$candidate->id][$identity] = true;
            }
        }

        return $occupancy;
    }

    private function normalize(string $value): string
    {
        return preg_replace('/[^a-z0-9]/', '', Str::lower(Str::ascii($value)));
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

    /** @param array<string, mixed> $source */
    private function place(MahasiswaProfil $profile, Kamar $candidate, Periode $period, array $source): ?string
    {
        Gedung::whereKey($candidate->lantai->gedung_id)->lockForUpdate()->firstOrFail();
        $room = Kamar::whereKey($candidate->id)->lockForUpdate()->firstOrFail();
        $paymentNote = 'Pembayaran hunian sudah diterima berdasarkan konfirmasi pengelola atas status check-in Excel; tidak ditagih ulang untuk impor ini. Nominal dan tanggal transaksi asli belum direkonsiliasi.';
        $confirmation = [...PenempatanKamar::IMPORT_PAYMENT_CONFIRMATION_2026, 'source_sheet' => $source['sheet'], 'source_row' => $source['row']];
        $placements = $profile->penempatanKamar()->where('status', 'aktif')->get();
        if ($placements->count() === 1 && $placements->first()->kamar_id === $room->id && $placements->first()->periode_id === $period->id) {
            $placement = $placements->first();
            if (str_starts_with($placement->catatan ?? '', 'Impor check-in Excel 2026.') && ! str_contains($placement->catatan, $paymentNote)) {
                $placement->update(['catatan' => $placement->catatan.' '.$paymentNote]);
            }
            if (str_starts_with($placement->catatan ?? '', 'Impor check-in Excel 2026.') && $placement->import_payment_confirmation === null) {
                $placement->update(['import_payment_confirmation' => $confirmation]);
            }

            return null;
        }
        if ($profile->penempatanKamar()->exists() || $profile->status_huni !== 'calon') {
            return 'riwayat atau penempatan yang ada dipertahankan.';
        }
        if ($profile->residenceRegistrations()->exists()) {
            return 'pendaftaran yang ada harus direkonsiliasi terlebih dahulu.';
        }
        $gender = $candidate->lantai->gedung->gender_peruntukan;
        if (! in_array($gender, ['campur', 'campuran'], true) && $profile->user->gender !== $gender) {
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
            'catatan' => 'Impor check-in Excel 2026. Tanggal masuk disamakan dengan awal periode sebagai tanggal administratif, bukan tanggal check-in asli. '.$paymentNote,
            'import_payment_confirmation' => $confirmation,
        ]);
        $profile->update(['status_huni' => 'aktif', 'periode_id' => $period->id, 'tanggal_masuk' => $period->tanggal_mulai]);
        $occupied++;
        $room->update(['status' => $occupied + $reserved >= $room->kapasitas ? 'penuh' : 'terisi_sebagian']);

        return null;
    }
}
