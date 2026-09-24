<?php

namespace Database\Seeders;

use App\Models\Informasi;
use App\Models\LandingContent;
use App\Models\Program;
use App\Models\ProgramSub;
use App\Models\Testimoni;
use Illuminate\Database\Seeder;

class LandingContentSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedProfilContent();
        $this->seedTestimoni();
        $this->seedPrograms();
        $this->seedInformasi();
    }

    private function seedProfilContent(): void
    {
        $this->upsert([
            'key' => 'sejarah',
            'title' => 'Sejarah',
            'content' => implode("\n\n", [
                'Sejarah Andalas Residence di Universitas Andalas berawal dari kebutuhan untuk menyediakan fasilitas akomodasi yang nyaman bagi mahasiswa, dosen, serta tamu universitas. Andalas Residence dirancang sebagai kompleks hunian yang mendukung lingkungan belajar dan tinggal yang kondusif, dilengkapi dengan berbagai fasilitas pendukung seperti ruang belajar, ruang olahraga, area makan, dan sistem keamanan.',
                'Pada awal pembangunannya, Andalas Residence bertujuan tidak hanya untuk menyediakan tempat tinggal, tetapi juga untuk menciptakan komunitas kampus yang inklusif dan interaktif. Seiring berjalannya waktu, tempat ini menjadi salah satu fasilitas penting bagi civitas akademika Universitas Andalas dan sering digunakan untuk kegiatan akademik maupun sosial.',
                'Rincian pendirian tiap gedung di Andalas Residence:',
                "1. Gedung A (RPX), didirikan tahun 2005 sebagai gedung hunian pertama.\n2. Gedung B (Rusunawa), dibangun tahun 2015 untuk menambah kapasitas akomodasi.\n3. Gedung C (PUPERA I), berdiri tahun 2019 untuk menampung lebih banyak mahasiswa baru.\n4. Gedung D (Menpera), selesai dibangun tahun 2010.\n5. Gedung E (RMS), dibangun tahun 2005 bersama dengan Gedung A.\n6. Gedung F (Orange), didirikan tahun 2007.\n7. Gedung G (Hijau), selesai tahun 2009.\n8. Gedung H (PUPERA III), dibangun tahun 2021 dengan desain modern.\n9. PUPERA II, didirikan tahun 2019 untuk nakes di lingkungan universitas.\n10. ASN, selesai tahun 2022 untuk Aparatur Sipil Negara Universitas Andalas.",
                'Andalas Residence kini menjadi salah satu fasilitas penting yang menunjang kehidupan kampus di Universitas Andalas, menyediakan lingkungan tinggal yang nyaman dan berbagai fasilitas pendukung bagi mahasiswa, staf, dan tamu universitas.',
            ]),
        ]);

        $this->upsert([
            'key' => 'visi_misi',
            'title' => 'Visi Misi',
            'content' => implode("\n\n", [
                'Visi adalah impian besar yang menjadi panduan arah masa depan, memberikan inspirasi dan tujuan akhir yang ingin dicapai. Sementara itu, misi adalah serangkaian langkah nyata yang membentuk jalan menuju impian tersebut.',
                'VISI',
                'Hunian nyaman, mandiri dan optimum dalam mendukung aktivitas civitas akademika serta menunjang income generating Universitas Andalas.',
                'MISI',
                "1. Menyediakan Hunian yang Nyaman dan Aman.\n2. Mengoptimalkan Fasilitas untuk Mendukung Aktivitas Akademik.\n3. Meningkatkan Kualitas Layanan Hunian yang Profesional.\n4. Mengelola Hunian secara Profesional dan Efisien.",
            ]),
        ]);

        $this->upsert([
            'key' => 'struktur_organisasi',
            'title' => 'Struktur Organisasi',
            'content' => implode("\n", [
                'Wakil Rektor II',
                'Direktur DPUB',
                'Kepala Andalas Residence',
                'Manager Operational',
                'Staff Administrasi',
                'Teknisi',
                'Staff Operational',
            ]),
        ]);
    }

    private function seedTestimoni(): void
    {
        $this->upsert(['nama' => 'Rizky Pratama', 'prodi' => "Teknik Informatika '22", 'teks' => 'Portal Andalas Residence benar-benar membantu. Bayar sewa asrama, ajukan izin pulang, sampai cek jadwal kegiatan, semua dari satu tempat tanpa harus antri ke kantor.'], Testimoni::class, 'nama');
        $this->upsert(['nama' => 'Sari Aulia Rahmi', 'prodi' => "Akuntansi '23", 'teks' => 'Fitur Smart Surrau-nya keren banget. Absensi kegiatan jadi lebih tertib dan aku bisa pantau riwayat kehadiran sendiri. Betul-betul mendukung pembinaan karakter.'], Testimoni::class, 'nama');
        $this->upsert(['nama' => 'Ahmad Fauzan', 'prodi' => "Hukum '21", 'teks' => 'Laporan kerusakan kamar sekarang langsung direspons teknisi. Dulu harus lapor manual ke pak penjaga, sekarang cukup foto dan submit dari HP.'], Testimoni::class, 'nama');
    }

    private function seedPrograms(): void
    {
        $karakter = Program::firstOrCreate(['nama' => 'Pengembangan Karakter'], [
            'deskripsi' => 'Program pembinaan karakter kepemimpinan dan kepegawaian bagi mahasiswa Andalas Residence.',
            'ikon' => 'star',
            'urutan' => 1,
        ]);

        $this->upsertSub($karakter->id, [
            ['judul' => 'Shalat Subuh Berjamaah', 'deskripsi' => implode("\n", [
                '1. Mahasiswa asrama diharuskan shalat berjamaah lima waktu.',
                '2. Diwajibkan shalat shubuh berjamaah di Masjid Nurul Ilmi setiap hari.',
                '3. Mahasiswa Asrama sudah harus berada di masjid 10 menit sebelum waktu adzan dikumandangkan.',
                '4. Mahasiswa asrama akan mendapatkan kunjungan dan pencerahan dari pimpinan beserta tamu undangan Unand.',
                '5. Mahasiswa Asrama yang shalat subuh akan dicek presensi (kehadiran)nya setiap hari.',
            ])],
            ['judul' => 'Monitoring dan Bina Quran', 'deskripsi' => implode("\n", [
                '1. Seluruh Mahasiswa Asrama diwajibkan mengikuti Program Mentoring dan Bina Baca Quran selama tinggal di asrama.',
                '2. Program dilaksanakan setelah mahasiswa check-in asrama dan dirutinkan dalam setiap pekan.',
                '3. Mahasiswa yang melaksanakan program akan dicek presensi dan dievaluasi oleh fasilitator.',
                '4. Bagi yang tidak mengikuti program akan diberikan sanksi sesuai ketentuan yang berlaku di asrama.',
            ])],
            ['judul' => 'Gerakan Magrib Mengaji (GEMARI)', 'deskripsi' => implode("\n", [
                '1. GEMARI dilaksanakan setiap setelah shalat magrib di gedung masing-masing.',
                '2. Bentuk acara gemari dapat berupa tilawah quran, kultum, tahsin, dll.',
                '3. Penanggung jawab GEMARI adalah mahasiswa asrama yang ditunjuk fasilitator.',
            ])],
        ]);

        $akademik = Program::firstOrCreate(['nama' => 'Pembinaan Akademik'], [
            'deskripsi' => 'Program pendampingan dan fasilitas belajar untuk mendukung keberhasilan akademik mahasiswa.',
            'ikon' => 'book',
            'urutan' => 2,
        ]);

        $this->upsertSub($akademik->id, [
            ['judul' => 'Ruang Belajar 24 Jam', 'deskripsi' => 'Ruang belajar bersama yang tenang, tersedia 24 jam dengan akses WiFi kampus berkecepatan tinggi untuk mendukung kegiatan akademik.'],
            ['judul' => 'Pendampingan Akademik', 'deskripsi' => 'Program bimbingan belajar dan pendampingan akademik yang dilaksanakan secara rutin oleh fasilitator dan dosen pendamping.'],
        ]);
    }

    private function seedInformasi(): void
    {
        $this->upsert([
            'kategori' => 'regulasi',
            'judul' => 'Tata Tertib Kehidupan Mahasiswa Andalas Residence',
            'konten' => implode("\n\n", [
                'TATA TERTIB ANDALAS RESIDENCE',
                'KETENTUAN UMUM',
                "1. Andalas Residence adalah tempat tinggal bagi Mahasiswa Universitas Andalas.\n2. Mahasiswa Andalas Residence adalah mahasiswa yang telah terdaftar dan menandatangani Surat Perjanjian serta bersedia mematuhi Tata Tertib.\n3. Pengelola Andalas Residence adalah personil UPT Andalas Residence yang bertugas di Andalas Residence.\n4. Program Pembinaan adalah rencana atau kegiatan yang dijalankan oleh Pengelola dan Fasilitator untuk pembentukan karakter kepemimpinan mahasiswa.",
                'HAK MAHASISWA',
                "1. Mendapat pelayanan administrasi, fasilitas, dan pelayanan Andalas Residence sesuai ketentuan.\n2. Mendapat kenyamanan dan keamanan sebagai Mahasiswa Andalas Residence.\n3. Mendapatkan kesempatan mengikuti program-program pembinaan, pengembangan diri, minat dan bakat sesuai aturan yang berlaku.",
            ]),
            'tanggal' => '2024-08-01',
        ], Informasi::class, 'judul');

        $this->upsert([
            'kategori' => 'sop',
            'judul' => 'SOP Check In',
            'konten' => implode("\n\n", [
                'Proses check-in di asrama adalah langkah awal bagi penghuni baru untuk menempati lingkungan hunian yang nyaman dan tertib. SOP Check-In dirancang untuk memberikan panduan yang sistematis bagi petugas asrama dan penghuni baru.',
                'Melalui SOP ini, kami berharap proses check-in dapat berlangsung dengan efisien dan transparan, sehingga penghuni dapat langsung beradaptasi dengan suasana asrama yang tertib dan kondusif.',
            ]),
            'tanggal' => '2024-08-01',
        ], Informasi::class, 'judul');

        $this->upsert([
            'kategori' => 'panduan',
            'judul' => 'Panduan Registrasi dan Login Akun',
            'konten' => implode("\n", [
                'Untuk bisa mengakses sistem, pengguna perlu mendaftar terlebih dahulu.',
                '1. Klik tombol Login pada halaman utama website.',
                '2. Klik tombol "Daftar Akun" jika belum melakukan pendaftaran.',
                '3. Isikan semua data diri sesuai form yang diberikan.',
                '4. Setelah berhasil melakukan pendaftaran, lakukan Login sesuai Email dan Password yang sudah dibuat.',
            ]),
            'tanggal' => '2024-08-01',
        ], Informasi::class, 'judul');

        $this->upsert([
            'kategori' => 'pengumuman',
            'judul' => 'Penetapan Penerima KIP Kuliah Mahasiswa Angkatan 2024',
            'konten' => 'Penetapan Penerima Kartu Indonesia Pintar Kuliah (KIP Kuliah) Mahasiswa Angkatan 2024 Universitas Andalas Semester Ganjil Tahun Akademik 2024/2025.',
            'tanggal' => '2025-02-25',
        ], Informasi::class, 'judul');
    }

    private function upsert(array $attributes, string $model = LandingContent::class, ?string $unique = null): void
    {
        $unique ??= 'key';
        $model::firstOrCreate([$unique => $attributes[$unique]], $attributes);
    }

    private function upsertSub(string $programId, array $items): void
    {
        $urutan = 1;
        foreach ($items as $item) {
            ProgramSub::firstOrCreate(
                ['program_id' => $programId, 'judul' => $item['judul']],
                [...$item, 'urutan' => $urutan++]
            );
        }
    }
}
