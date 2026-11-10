<?php

namespace Database\Seeders;

use App\Models\Departemen;
use App\Models\Faculty;
use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\KipkRecipient;
use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class ResidenceRegistrationUatSeeder extends Seeder
{
    public function run(): void
    {
        $production = app()->isProduction();
        $password = (string) config('residence_uat.password', '');
        if ($production && (! config('residence_uat.enabled') || strlen($password) < 16)) {
            throw new \LogicException('Produksi memerlukan RESIDENCE_UAT_ENABLED=true dan RESIDENCE_UAT_PASSWORD minimal 16 karakter.');
        }
        if ($password === '') {
            $password = 'Residence-UAT-2026!';
        }
        foreach (['admin_layanan', 'pimpinan', 'fasilitator', 'go', 'mahasiswa'] as $role) {
            if (! Role::where('name', $role)->where('guard_name', 'web')->exists()) {
                throw new \LogicException('Siapkan RolePermissionSeeder sebelum akun UAT.');
            }
        }
        DB::transaction(function () use ($password): void {
            $period = Periode::where('status', 'aktif')->firstOrFail();
            $intake = $period->angkatan_maba ?: (int) date('Y');
            $building = Gedung::where('gender_peruntukan', 'perempuan')->orderBy('kode_gedung')->firstOrFail();
            $faculty = Faculty::firstOrCreate(['name' => 'Fakultas UAT Pendaftaran']);
            $department = Departemen::firstOrCreate(['name' => 'Departemen UAT Pendaftaran', 'faculty_id' => $faculty->id]);
            $programs = [];
            foreach (['S1', 'S2', 'S3'] as $degree) {
                $programs[$degree] = Prodi::firstOrCreate(['name' => 'Program UAT '.$degree, 'departemen_id' => $department->id, 'jenjang' => $degree]);
            }
            foreach (['pengelola' => 'admin_layanan', 'keuangan' => 'admin_layanan', 'pimpinan' => 'pimpinan', 'fasilitator' => 'fasilitator', 'inspeksi' => 'go'] as $name => $role) {
                $user = User::firstOrCreate(['email' => 'uat.'.$name.'@example.test'], ['nim_nip' => 'UAT-'.strtoupper($name), 'nama' => 'UAT '.ucfirst($name), 'password' => $password, 'status' => 'aktif', 'email_verified_at' => now()]);
                if ($user->wasRecentlyCreated) {
                    $user->assignRole($role);
                    if ($role === 'fasilitator') {
                        FasilitatorWilayah::create(['user_id' => $user->id, 'gedung_id' => $building->id]);
                    }
                }
            }
            foreach (['lokal' => 'S1', 'kipk' => 'S1', 'teman' => 'S1', 's2' => 'S2', 's3' => 'S3', 'internasional' => 'S2'] as $index => $degree) {
                $offset = array_search($index, ['lokal', 'kipk', 'teman', 's2', 's3', 'internasional'], true) + 1;
                $nim = substr((string) $intake, -2).'9988'.str_pad((string) $offset, 4, '0', STR_PAD_LEFT);
                $user = User::firstOrCreate(['email' => 'uat.'.$index.'@example.test'], ['nim_nip' => $nim, 'nama' => 'UAT '.ucfirst($index), 'password' => $password, 'gender' => 'perempuan', 'status' => 'aktif', 'email_verified_at' => now(), 'client_profile_category' => $index === 'internasional' ? 'international_student' : ($index === 'kipk' ? 'local_kipk' : 'local_non_kipk')]);
                if (! $user->wasRecentlyCreated) {
                    continue;
                }
                $user->assignRole('mahasiswa');
                MahasiswaProfil::create(['user_id' => $user->id, 'prodi_id' => $programs[$degree]->id, 'angkatan' => (string) $intake, 'barcode_code' => 'UAT-'.$nim, 'status_huni' => 'calon']);
                if ($index === 'kipk') {
                    KipkRecipient::firstOrCreate(['nim' => $nim, 'angkatan' => $intake], ['nama' => $user->nama]);
                }
            }
            $this->command?->info('Akun baru uat.<peran>@example.test dibuat. Gunakan password konfigurasi UAT. Akun yang sudah ada tidak direset.');
            $this->command?->info('Fasilitator baru ditugaskan pada '.$building->nama_gedung.'. Kebijakan, tarif, dan penghuni lama tidak diubah.');
        });
    }
}
