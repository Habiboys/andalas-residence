<?php

namespace Database\Seeders;

use App\Models\Departemen;
use App\Models\Faculty;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\KategoriTransaksi;
use App\Models\Kuesioner;
use App\Models\KuesionerOpsi;
use App\Models\KuesionerPertanyaan;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $roles = ['superadmin', 'pimpinan', 'staff_admin', 'fasilitator', 'teknisi', 'mahasiswa'];
        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $faculty = Faculty::create(['name' => 'Fakultas Teknik']);
        $departemen = Departemen::create(['faculty_id' => $faculty->id, 'name' => 'Teknik Informatika']);
        $prodi = Prodi::create(['departemen_id' => $departemen->id, 'name' => 'Informatika', 'jenjang' => 'S1']);

        $periode = Periode::create([
            'nama_periode' => '2025/2026 Ganjil',
            'status' => 'aktif',
            'tanggal_mulai' => '2025-08-01',
            'tanggal_selesai' => '2026-01-31',
        ]);

        $gedung = Gedung::create([
            'kode_gedung' => 'A',
            'nama_gedung' => 'Asrama Putra A',
            'gender_peruntukan' => 'laki_laki',
            'alamat' => 'Kampus Limau Manis',
        ]);

        $lantai = Lantai::create([
            'gedung_id' => $gedung->id,
            'nomor_lantai' => 1,
            'nama_lantai' => 'Lantai 1',
        ]);

        for ($i = 101; $i <= 110; $i++) {
            Kamar::create([
                'lantai_id' => $lantai->id,
                'nomor_kamar' => (string) $i,
                'kapasitas' => 2,
                'status' => 'kosong',
                'tipe_kamar' => 'reguler',
                'tarif_per_periode' => 1500000,
            ]);
        }

        KategoriTransaksi::insert([
            ['id' => (string) Str::uuid7(), 'nama_kategori' => 'Pembayaran Sewa Asrama', 'tipe' => 'pemasukan', 'created_at' => now(), 'updated_at' => now()],
            ['id' => (string) Str::uuid7(), 'nama_kategori' => 'Operasional Gedung', 'tipe' => 'pengeluaran', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $users = [
            ['nim_nip' => 'SA001', 'nama' => 'Super Admin', 'email' => 'superadmin@unand.ac.id', 'role' => 'superadmin'],
            ['nim_nip' => 'P001', 'nama' => 'Pimpinan Asrama', 'email' => 'pimpinan@unand.ac.id', 'role' => 'pimpinan'],
            ['nim_nip' => 'ADM001', 'nama' => 'Staff Administrasi', 'email' => 'admin@unand.ac.id', 'role' => 'staff_admin'],
            ['nim_nip' => 'FAS001', 'nama' => 'Fasilitator Lantai 1', 'email' => 'fasilitator@unand.ac.id', 'role' => 'fasilitator'],
            ['nim_nip' => 'TEK001', 'nama' => 'Teknisi A', 'email' => 'teknisi@unand.ac.id', 'role' => 'teknisi'],
            ['nim_nip' => '2211521001', 'nama' => 'Mahasiswa Demo', 'email' => 'mahasiswa@unand.ac.id', 'role' => 'mahasiswa'],
        ];

        foreach ($users as $data) {
            $user = User::create([
                'nim_nip' => $data['nim_nip'],
                'nama' => $data['nama'],
                'email' => $data['email'],
                'password' => 'password',
                'no_hp' => '081234567890',
                'gender' => 'laki_laki',
                'status' => 'aktif',
            ]);
            $user->assignRole($data['role']);

            if ($data['role'] === 'mahasiswa') {
                MahasiswaProfil::create([
                    'user_id' => $user->id,
                    'prodi_id' => $prodi->id,
                    'periode_id' => $periode->id,
                    'angkatan' => '2022',
                    'barcode_code' => 'BC-'.$data['nim_nip'],
                    'nik' => '1234567890123456',
                    'status_huni' => 'calon',
                ]);
            }
        }

        $admin = User::role('staff_admin')->first();
        $kuesioner = Kuesioner::create([
            'kode' => 'KT-TEKNISI-V1',
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
            $pertanyaan = KuesionerPertanyaan::create([
                'kuesioner_id' => $kuesioner->id,
                'kode_pertanyaan' => $p['kode'],
                'teks_pertanyaan' => $p['teks'],
                'tipe_jawaban' => 'skala',
                'bobot' => $p['bobot'],
                'skor_minimal' => 1,
                'skor_maksimal' => 5,
                'wajib' => true,
                'urutan' => $idx + 1,
            ]);

            for ($s = 1; $s <= 5; $s++) {
                KuesionerOpsi::create([
                    'pertanyaan_id' => $pertanyaan->id,
                    'label' => (string) $s,
                    'nilai_skor' => $s,
                    'urutan' => $s,
                ]);
            }
        }

        $this->call([LandingContentSeeder::class, RolePermissionSeeder::class]);
    }
}
