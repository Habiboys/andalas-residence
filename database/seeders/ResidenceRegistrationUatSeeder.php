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
        $password = 'password';
        foreach (['superadmin', 'admin_layanan', 'pimpinan', 'fasilitator', 'go', 'mahasiswa', 'teknisi', 'admin_aset'] as $role) {
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
            foreach (['superadmin' => 'superadmin', 'pengelola' => 'admin_layanan', 'keuangan' => 'admin_layanan', 'pimpinan' => 'pimpinan', 'fasilitator' => 'fasilitator', 'inspeksi' => 'go', 'teknisi' => 'teknisi', 'teknisi2' => 'teknisi', 'teknisi3' => 'teknisi', 'aset' => 'admin_aset', 'fasilitator2' => 'fasilitator'] as $name => $role) {
                $user = User::firstOrCreate(['email' => 'uat.'.$name.'@example.test'], ['nim_nip' => 'UAT-'.strtoupper($name), 'nama' => 'UAT '.ucfirst($name), 'password' => $password, 'status' => 'aktif', 'email_verified_at' => now()]);
                $user->forceFill(['password' => $password, 'email_verified_at' => now()])->save();
                if ($user->wasRecentlyCreated) {
                    $user->assignRole($role);
                    if ($role === 'fasilitator') {
                        $assignedBuilding = $name === 'fasilitator2' ? Gedung::where('id', '!=', $building->id)->orderBy('kode_gedung')->first() : $building;
                        if ($assignedBuilding) {
                            FasilitatorWilayah::create(['user_id' => $user->id, 'gedung_id' => $assignedBuilding->id]);
                        }
                    }
                }
            }
            foreach (['lokal' => 'S1', 'kipk' => 'S1', 'teman' => 'S1', 's2' => 'S2', 's3' => 'S3', 'internasional' => 'S2', 'bulanan' => 'S1'] as $index => $degree) {
                $offset = array_search($index, ['lokal', 'kipk', 'teman', 's2', 's3', 'internasional', 'bulanan'], true) + 1;
                $cohort = $index === 'bulanan' ? $intake - 1 : $intake;
                $nim = substr((string) $cohort, -2).'9988'.str_pad((string) $offset, 4, '0', STR_PAD_LEFT);
                $user = User::firstOrCreate(['email' => 'uat.'.$index.'@example.test'], ['nim_nip' => $nim, 'nama' => 'UAT '.ucfirst($index), 'password' => $password, 'gender' => 'perempuan', 'status' => 'aktif', 'email_verified_at' => now(), 'client_profile_category' => $index === 'internasional' ? 'international_student' : ($index === 'kipk' ? 'local_kipk' : 'local_non_kipk')]);
                $user->forceFill(['password' => $password, 'email_verified_at' => now()])->save();
                if (! $user->wasRecentlyCreated) {
                    continue;
                }
                $user->assignRole('mahasiswa');
                MahasiswaProfil::create(['user_id' => $user->id, 'prodi_id' => $programs[$degree]->id, 'angkatan' => (string) $cohort, 'periode_id' => $period->id, 'barcode_code' => 'UAT-'.$nim, 'status_huni' => 'calon']);
                if ($index === 'kipk') {
                    KipkRecipient::firstOrCreate(['nim' => $nim, 'angkatan' => $intake], ['nama' => $user->nama]);
                }
            }
            $this->command->info('Akun baru uat.<peran>@example.test dibuat. Password akun uat.*: password. Seed ulang mereset password akun UAT, bukan transaksi atau akun lain.');
            $this->command->info('Fasilitator baru ditugaskan pada '.$building->nama_gedung.'. Kebijakan, tarif, dan penghuni lama tidak diubah.');
        });
    }
}
