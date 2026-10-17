<?php

namespace Database\Seeders;

use App\Enums\ClientProfileCategory;
use App\Models\KategoriTransaksi;
use App\Models\Kuesioner;
use App\Models\KuesionerOpsi;
use App\Models\KuesionerPertanyaan;
use App\Models\MahasiswaProfil;
use App\Models\ParentStudentLink;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \LogicException('DatabaseSeeder berisi akun demo; gunakan RolePermissionSeeder untuk data hak akses produksi.');
        }

        $this->call(RolePermissionSeeder::class);

        $roles = ['superadmin', 'pimpinan', 'staff_admin', 'admin_layanan', 'admin_aset', 'fasilitator', 'teknisi', 'mahasiswa', 'orang_tua', 'go'];
        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->call(UnandAcademicSeeder::class);
        $prodi = Prodi::where('code', '15-03-01')->firstOrFail();

        $this->call([ResidenceMasterSeeder::class, Residence2026StudentSeeder::class]);

        $periode = Periode::where('nama_periode', '2026/2027')->sole();

        KategoriTransaksi::firstOrCreate(['nama_kategori' => 'Pembayaran Sewa Asrama', 'tipe' => 'pemasukan']);
        KategoriTransaksi::firstOrCreate(['nama_kategori' => 'Operasional Gedung', 'tipe' => 'pengeluaran']);

        $users = [
            ['nim_nip' => 'SA001', 'nama' => 'Super Admin', 'email' => 'superadmin@unand.ac.id', 'role' => 'superadmin'],
            ['nim_nip' => 'P001', 'nama' => 'Pimpinan Asrama', 'email' => 'pimpinan@unand.ac.id', 'role' => 'pimpinan'],
            ['nim_nip' => 'ADM001', 'nama' => 'Staff Administrasi', 'email' => 'admin@unand.ac.id', 'role' => 'staff_admin'],
            ['nim_nip' => 'LAY001', 'nama' => 'Admin Layanan', 'email' => 'admin.layanan@unand.ac.id', 'role' => 'admin_layanan'],
            ['nim_nip' => 'AST001', 'nama' => 'Admin Aset', 'email' => 'admin.aset@unand.ac.id', 'role' => 'admin_aset'],
            ['nim_nip' => 'FAS001', 'nama' => 'Fasilitator Lantai 1', 'email' => 'fasilitator@unand.ac.id', 'role' => 'fasilitator'],
            ['nim_nip' => 'TEK001', 'nama' => 'Teknisi A', 'email' => 'teknisi@unand.ac.id', 'role' => 'teknisi'],
            ['nim_nip' => 'GO001', 'nama' => 'GO Cleaning Service', 'email' => 'go@unand.ac.id', 'role' => 'go'],
            ['nim_nip' => 'ORT001', 'nama' => 'Orang Tua Demo', 'email' => 'orang.tua@unand.ac.id', 'role' => 'orang_tua', 'category' => ClientProfileCategory::Parent],
            ['nim_nip' => 'INT001', 'nama' => 'Mahasiswa Internasional Gratis', 'email' => 'international@unand.ac.id', 'role' => 'mahasiswa', 'category' => ClientProfileCategory::InternationalFreeFacility, 'angkatan' => '2026'],
            ['nim_nip' => 'INT002', 'nama' => 'Mahasiswa Internasional Berbayar', 'email' => 'international.paid@unand.ac.id', 'role' => 'mahasiswa', 'category' => ClientProfileCategory::InternationalStudent, 'angkatan' => '2026'],
            ['nim_nip' => 'NMS001', 'nama' => 'Client Non Mahasiswa', 'email' => 'nonmahasiswa@unand.ac.id', 'role' => 'mahasiswa', 'category' => ClientProfileCategory::NonStudent],
        ];

        $studentProfiles = [];
        foreach ($users as $data) {
            $originalNumber = $data['nim_nip'];
            if (isset($data['angkatan'])) {
                $data['nim_nip'] = substr($data['angkatan'], -2).(str_starts_with($originalNumber, 'INT') ? '99001'.substr($originalNumber, -3) : substr($originalNumber, 2));
            }
            $user = User::firstOrCreate(['email' => $data['email']], [
                'nim_nip' => $data['nim_nip'],
                'nama' => $data['nama'],
                'password' => 'password',
                'no_hp' => '081234567890',
                'gender' => 'laki_laki',
                'status' => 'aktif',
                'client_profile_category' => $data['category'] ?? null,
            ]);
            if ($user->wasRecentlyCreated) {
                $user->assignRole($data['role']);
            }

            if ($data['role'] === 'mahasiswa') {
                $studentProfiles[$data['email']] = MahasiswaProfil::firstOrCreate(['user_id' => $user->id], [
                    'prodi_id' => isset($data['angkatan']) ? $prodi->id : null,
                    'periode_id' => $periode->id,
                    'angkatan' => $data['angkatan'] ?? null,
                    'barcode_code' => 'BC-'.$data['nim_nip'],
                    'nik' => str_pad($data['nim_nip'], 16, '0', STR_PAD_LEFT),
                    'status_huni' => 'calon',
                ]);
                if (isset($data['angkatan']) && $user->nim_nip === $originalNumber) {
                    $user->update(['nim_nip' => substr($studentProfiles[$data['email']]->angkatan, -2).substr($data['nim_nip'], 2)]);
                }
            }
        }

        $parent = User::where('email', 'orang.tua@unand.ac.id')->firstOrFail();
        $student = $studentProfiles['international@unand.ac.id'];
        ParentStudentLink::firstOrCreate(
            ['parent_user_id' => $parent->id, 'student_profile_id' => $student->id],
            ['relationship' => 'guardian', 'is_primary_contact' => true],
        );

        $admin = User::role('staff_admin')->first();
        $kuesioner = Kuesioner::firstOrCreate(['kode' => 'KT-TEKNISI-V1'], [
            'nama' => 'Kuesioner Penilaian Teknisi v1',
            'jenis' => 'penilaian_teknisi',
            'versi' => 1,
            'status' => 'aktif',
            'dibuat_oleh' => $admin->id,
        ]);

        $pertanyaanData = [
            ['kode' => 'Q1', 'teks' => 'Kecepatan respons teknisi', 'bobot' => 2],
            ['kode' => 'Q2', 'teks' => 'Kualitas hasil perbaikan', 'bobot' => 3],
            ['kode' => 'Q3', 'teks' => 'Kepatuhan SOP dan dokumentasi', 'bobot' => 2],
        ];

        foreach ($pertanyaanData as $idx => $p) {
            $pertanyaan = KuesionerPertanyaan::firstOrCreate(['kuesioner_id' => $kuesioner->id, 'kode_pertanyaan' => $p['kode']], [
                'teks_pertanyaan' => $p['teks'],
                'tipe_jawaban' => 'skala',
                'bobot' => $p['bobot'],
                'skor_minimal' => 1,
                'skor_maksimal' => 5,
                'wajib' => true,
                'urutan' => $idx + 1,
            ]);

            for ($s = 1; $s <= 5; $s++) {
                KuesionerOpsi::firstOrCreate(['pertanyaan_id' => $pertanyaan->id, 'label' => (string) $s], [
                    'nilai_skor' => $s,
                    'urutan' => $s,
                ]);
            }
        }

        $this->call([LandingContentSeeder::class, DocumentSystemSeeder::class]);
        $this->command?->info('Mahasiswa lokal memakai data Excel 2026/2027. Contoh penghuni hanya untuk kategori internasional dan non-mahasiswa; contoh orang tua dipertahankan.');
        $this->command?->table(['Akun contoh', 'Kategori'], [
            ['international@unand.ac.id', 'Internasional fasilitas gratis'],
            ['international.paid@unand.ac.id', 'Internasional berbayar'],
            ['nonmahasiswa@unand.ac.id', 'Non-mahasiswa'],
            ['orang.tua@unand.ac.id', 'Orang tua mahasiswa internasional contoh'],
        ]);
        $this->command?->info('Password akun contoh: password. Akun mahasiswa impor memakai password acak dan memerlukan pengaturan akses sendiri.');
    }
}
