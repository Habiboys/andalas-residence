<?php

namespace Database\Seeders;

use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class BuildingStaffAccountSeeder extends Seeder
{
    /**
     * Canonical short slugs matching real building codes in Data Asrama.xlsx.
     *
     * @var array<string, string>
     */
    private const CANONICAL_SLUGS = [
        'A' => 'rpx',
        'B' => 'rusunawa',
        'C' => 'puperaputeri',
        'D' => 'menpera',
        'E' => 'rms',
        'F' => 'oren',
        'G' => 'hijau',
        'H' => 'puperaputera',
        'ASN' => 'asn',
        'NAKES' => 'nakes',
    ];

    public function run(): void
    {
        Role::firstOrCreate(['name' => 'fasilitator', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'go', 'guard_name' => 'web']);

        $defaultPassword = (string) config('app.building_staff_default_password', 'password');
        $buildings = Gedung::query()->orderBy('kode_gedung')->get();
        $rows = [];

        foreach ($buildings as $building) {
            $slug = self::slugForBuilding($building);
            $gender = $building->gender_peruntukan === 'perempuan' ? 'perempuan' : 'laki_laki';
            $cleanCode = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $building->kode_gedung) ?: $slug);

            foreach ([
                'fasilitator' => [
                    'email' => $slug.'.fasilitator@unand.ac.id',
                    'nim_nip' => 'FAS-'.$cleanCode,
                    'nama' => 'Fasilitator '.$building->nama_gedung,
                ],
                'go' => [
                    'email' => $slug.'.go@unand.ac.id',
                    'nim_nip' => 'GO-'.$cleanCode,
                    'nama' => 'GO '.$building->nama_gedung,
                ],
            ] as $role => $spec) {
                $user = User::query()->where('email', $spec['email'])->first()
                    ?? User::query()->where('nim_nip', $spec['nim_nip'])->first();

                if ($user === null) {
                    $user = User::create([
                        'email' => $spec['email'],
                        'nim_nip' => $spec['nim_nip'],
                        'nama' => $spec['nama'],
                        'password' => $defaultPassword,
                        'email_verified_at' => now(),
                        'no_hp' => '08116699634',
                        'gender' => $gender,
                        'status' => 'aktif',
                    ]);
                } elseif ($user->status !== 'aktif') {
                    $user->update(['status' => 'aktif']);
                }

                if (! $user->hasRole($role)) {
                    $user->assignRole($role);
                }

                FasilitatorWilayah::updateOrCreate(
                    ['user_id' => $user->id],
                    ['gedung_id' => $building->id],
                );

                $rows[] = [$building->kode_gedung, $building->nama_gedung, strtoupper($role), $user->email];
            }
        }

        if ($this->command !== null) {
            $this->command->info('Akun Fasilitator & GO per gedung berhasil disiapkan (password default: '.$defaultPassword.').');
            $this->command->table(['Kode', 'Gedung', 'Role', 'Email'], $rows);
        }
    }

    public static function slugForBuilding(Gedung $building): string
    {
        $codeKey = strtoupper(trim((string) $building->kode_gedung));
        if (isset(self::CANONICAL_SLUGS[$codeKey])) {
            return self::CANONICAL_SLUGS[$codeKey];
        }

        $stripped = preg_replace('/\([^)]*\)/', '', (string) $building->nama_gedung) ?? (string) $building->nama_gedung;
        $stripped = preg_replace('/^\s*gedung\s+/i', '', trim($stripped)) ?? trim($stripped);
        $slug = Str::slug($stripped, '');

        return $slug !== '' ? $slug : strtolower(preg_replace('/[^a-z0-9]/i', '', $codeKey) ?: 'gedung');
    }
}
