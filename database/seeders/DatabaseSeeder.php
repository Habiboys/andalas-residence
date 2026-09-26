<?php

namespace Database\Seeders;

use App\Enums\ClientProfileCategory;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\KategoriTransaksi;
use App\Models\Kuesioner;
use App\Models\KuesionerOpsi;
use App\Models\KuesionerPertanyaan;
use App\Models\Lantai;
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

        $this->call(ResidenceBuildingSeeder::class);

        $periode = Periode::firstOrCreate(['nama_periode' => '2025/2026 Ganjil'], [
            'status' => 'nonaktif',
            'tanggal_mulai' => '2025-08-01',
            'tanggal_selesai' => '2026-01-31',
        ]);

        $gedung = Gedung::firstOrCreate(['kode_gedung' => 'A'], [
            'nama_gedung' => 'RPX (A)',
            'gender_peruntukan' => 'perempuan',
            'alamat' => 'Kampus Limau Manis',
        ]);

        $lantai = Lantai::firstOrCreate(['gedung_id' => $gedung->id, 'nomor_lantai' => 1], [
            'nama_lantai' => 'Lantai 1',
        ]);

        for ($i = 101; $i <= 110; $i++) {
            Kamar::firstOrCreate(['lantai_id' => $lantai->id, 'nomor_kamar' => (string) $i], [
                'kapasitas' => 2,
                'status' => 'kosong',
                'tipe_kamar' => 'reguler',
                'tarif_per_periode' => 1500000,
            ]);
        }

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
            ['nim_nip' => '2211521001', 'nama' => 'Client Lokal KIPK', 'email' => 'mahasiswa.kipk@unand.ac.id', 'role' => 'mahasiswa', 'category' => ClientProfileCategory::LocalKipk, 'angkatan' => '2026'],
            ['nim_nip' => '2211521002', 'nama' => 'Client Lokal Non-KIPK', 'email' => 'mahasiswa.nonkipk@unand.ac.id', 'role' => 'mahasiswa', 'category' => ClientProfileCategory::LocalNonKipk, 'angkatan' => '2026'],
            ['nim_nip' => '2211521003', 'nama' => 'Mahasiswa Penghuni Lokal', 'email' => 'mahasiswa.penghuni@unand.ac.id', 'role' => 'mahasiswa', 'category' => ClientProfileCategory::LocalNonKipk, 'angkatan' => '2025'],
            ['nim_nip' => 'INT001', 'nama' => 'Mahasiswa Internasional Gratis', 'email' => 'international@unand.ac.id', 'role' => 'mahasiswa', 'category' => ClientProfileCategory::InternationalFreeFacility, 'angkatan' => '2026'],
            ['nim_nip' => 'NMS001', 'nama' => 'Client Non Mahasiswa', 'email' => 'nonmahasiswa@unand.ac.id', 'role' => 'mahasiswa', 'category' => ClientProfileCategory::NonStudent],
        ];

        $studentProfiles = [];
        foreach ($users as $data) {
            $originalNumber = $data['nim_nip'];
            if (isset($data['angkatan'])) {
                $data['nim_nip'] = substr($data['angkatan'], -2).($originalNumber === 'INT001' ? '99001001' : substr($originalNumber, 2));
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
        $student = $studentProfiles['mahasiswa.kipk@unand.ac.id'];
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

        $this->call([LandingContentSeeder::class, DocumentSystemSeeder::class, ResidenceScenarioSeeder::class, ResidenceOperationsSeeder::class]);
        $this->command?->table(['Akun demo', 'Kegunaan'], [
            ['superadmin@example.test', 'Seluruh pengelolaan dan audit'],
            ['admin_layanan@example.test', 'Pendaftaran, tagihan, pembayaran, surat'],
            ['admin_aset@example.test', 'Stok, lokasi, dan jumlah aset'],
            ['fasilitator@example.test', 'QR absensi, izin, checkout gedung DEMO-P/W'],
            ['go@example.test', 'Pemeriksaan kamar checkout'],
            ['teknisi@example.test', 'Tiket dan bukti perbaikan'],
            ['pimpinan@example.test', 'Laporan dan dashboard'],
            ['orang_tua@example.test', 'Pemantauan anak: binaan-aktif'],
            ['binaan-aktif@example.test', 'Penghuni tahun pertama dan scan QR'],
            ['bayar-verifikasi@example.test', 'Pembayaran menunggu verifikasi'],
            ['cicilan-aktif@example.test', 'Cicilan pertama lunas, termin berikutnya terbuka'],
            ['checkout-siap@example.test', 'Inspeksi GO selesai, menunggu fasilitator'],
            ['legacy-belum-lunas@example.test', 'Tagihan alumni sebelum terbit surat'],
        ]);
        $this->command?->info('Password awal semua akun demo: password. Daftar 54 skenario tersedia di ResidenceScenarioSeeder::scenarios().');
    }
}
