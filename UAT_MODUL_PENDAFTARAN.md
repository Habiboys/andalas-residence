# UAT Modul Pendaftaran Andalas Residence

Acuan: BPMN To-Be, sheet Validasi client, dan rancangan penyesuaian alur pendaftaran terbaru. Tanggal pembaruan: **12 November 2026**.

---

## 1. Siapkan Akun UAT

Semua akun di bawah memakai **password: `password`** melalui **login akun biasa** (`/login`). Tidak perlu pengaturan `.env` tambahan untuk akun UAT. Menjalankan ulang seeder hanya mereset password khusus akun `uat.*` menjadi `password`; transaksi, penempatan, dan akun lain tidak direset.

```bash
docker compose exec -T andalas-app php artisan db:seed --class=ResidenceRegistrationUatSeeder --force --no-interaction
```

Atau pada lingkungan pengembangan lokal:

```bash
php artisan db:seed --class=ResidenceRegistrationUatSeeder --force --no-interaction
```

### 1.1 Daftar Akun Pengelola & Petugas Internal (`@unand.ac.id`)

| Email Login | NIP / Kode | Role Aplikasi | Kegunaan dalam UAT |
| --- | --- | --- | --- |
| `uat.superadmin@unand.ac.id` | `1989000001` | `superadmin` | Konfigurasi master **Gedung & Kamar**, penugasan fasilitator, dan pengecekan lintas peran |
| `uat.pengelola@unand.ac.id` | `1989000002` | `admin_layanan` | Buka/tutup pendaftaran, verifikasi dokumen, terbitkan tagihan kamar bersama, permohonan institusi/S2/S3/kegiatan, penyewa umum, dan pengaturan termin |
| `uat.keuangan@unand.ac.id` | `1989000003` | `admin_layanan` (+ izin `pembayaran.verify`) | Pencatatan referensi penerimaan resmi DPUB, pencocokan alokasi pembayaran ke tagihan, dan pengiriman invoice grup/sponsor |
| `uat.pimpinan@unand.ac.id` | `1989000004` | `pimpinan` | Persetujuan (ACC) atau penolakan pengajuan cicilan dan penundaan pembayaran |
| `uat.fasilitator@unand.ac.id` | `1989000005` | `fasilitator` | Verifikasi fisik check-in (KTP, berkas asli, serah kunci), mutasi kamar, dan pengembalian kunci sesuai gedung penugasan |
| `uat.fasilitator2@unand.ac.id` | `1989000008` | `fasilitator` | Fasilitator gedung pembanding untuk menguji penolakan akses lintas gedung |
| `uat.inspeksi@unand.ac.id` | `1989000006` | `go` | Petugas Green Office (GO): pemeriksaan kondisi kamar dan inventaris saat check-out |
| `uat.aset@unand.ac.id` | `1989000007` | `admin_aset` | Pengelolaan master bangunan, kamar, dan inventaris aset |

### 1.2 Daftar Akun Mahasiswa / Calon Penghuni (`@student.unand.ac.id`)

| Email Login | NIM | Jenjang & Angkatan | Kategori Profil | Kegunaan dalam UAT |
| --- | --- | --- | --- | --- |
| `uat.lokal@student.unand.ac.id` | `2611529001` | S1 — 2026 | `local_non_kipk` | Mahasiswa S1 lokal non-KIP-K (pendaftaran reguler atau pengundang kamar bersama) |
| `uat.kipk@student.unand.ac.id` | `2611529002` | S1 — 2026 | `local_kipk` | Mahasiswa S1 KIP-K tahun pertama, otomatis terdaftar di roster penerima KIP-K |
| `uat.teman@student.unand.ac.id` | `2611529003` | S1 — 2026 | `local_non_kipk` | Mahasiswa S1 lokal non-KIP-K penerima undangan teman sekamar (`Kamar Bersama`) |
| `uat.bulanan@student.unand.ac.id` | `2511529004` | S1 — 2025 | `local_non_kipk` | Mahasiswa S1 non-maba (angkatan lama) untuk pengujian skema sewa bulanan |
| `uat.s2@student.unand.ac.id` | `2621529005` | S2 — 2026 | `local_non_kipk` | Mahasiswa Pascasarjana Magister (S2) mandiri |
| `uat.s3@student.unand.ac.id` | `2631529006` | S3 — 2026 | `local_non_kipk` | Mahasiswa Pascasarjana Doktor (S3) mandiri |
| `uat.internasional@student.unand.ac.id` | `2699009007` | S1 — 2026 | `international_student` | Mahasiswa internasional untuk pengujian permohonan institusi/sponsor & upgrade kamar |

> **Catatan Penting:**
> - Seluruh mahasiswa uji di atas berjenis kelamin **perempuan** dan telah memiliki data dasar untuk diuji.
> - Fasilitator utama (`uat.fasilitator@unand.ac.id`) ditugaskan ke gedung perempuan pertama yang ditemukan saat seeding. Perhatikan informasi gedung pada output terminal saat menjalankan seeder.
> - **Batas siap uji:** Seeder hanya menyiapkan akun dan profil dasar tanpa mengarang kebijakan pendaftaran, alokasi kamar, atau pembayaran fiktif. Langkah persiapan oleh pengelola pada Bagian 3 wajib dilakukan sebagai bagian dari pengujian.

---

## 2. Peta Navigasi & Perubahan Alur Terbaru

### 2.1 Menu Sidebar Pengelola (`Pengelolaan Pendaftaran`)
Pada akun `superadmin`, `staff_admin`, dan `admin_layanan`, menu **Pengelolaan Pendaftaran** di sidebar kiri kini berbentuk **menu tarik-turun (collapsible submenu)** yang dapat dibuka dan ditutup dengan menekan judul **Pengelolaan Pendaftaran**:

1. **Daftar Pengajuan** (`/admin/residence-workflow`)
   - Menampilkan ringkasan metrik operasional, panel **Kamar bersama menunggu penerbitan tagihan** (jika ada pengajuan kamar bersama yang anggotanya sudah lengkap), serta daftar seluruh pengajuan hunian untuk pemeriksaan dokumen, keputusan cicilan/penundaan/bulanan, check-in, mutasi, dan pengembalian kunci.
2. **Buka / Tutup Pendaftaran** (`/admin/residence-workflow?section=opening`)
   - Menampilkan kartu status ke-5 kategori (`Lokal non-KIP-K`, `KIP-K`, `Internasional / S2 / S3`, `Summer Course`, `Umum`), daftar **Gedung yang siap** beserta rincian tarif otomatis dari Master **Gedung & Kamar**, peringatan **Gedung yang masih perlu dilengkapi** dengan tombol pintasan langsung, serta tombol satu klik **Buka Pendaftaran** / **Tutup Pendaftaran**.
3. **Permohonan Institusi & Kegiatan** (`/admin/residence-workflow?section=applications`)
   - Formulir terstruktur 4 bagian (*Identitas permohonan*, *Pembiayaan dan kontak*, *Rencana masa tinggal*, *Daftar peserta*) dan daftar permohonan tercatat untuk mahasiswa Internasional, S2/S3 mandiri, maupun peserta kegiatan/Summer Course.
4. **Penyewa Umum** (`/admin/residence-workflow?section=public`)
   - Formulir pencatatan penyewa umum/non-mahasiswa per kamar/periode atau harian beserta unggah bukti transfer atau pengajuan penundaan pembayaran.
5. **Rekonsiliasi & Invoice** (`/admin/residence-workflow?section=finance`)
   - Pencatatan referensi penerimaan resmi DPUB, pencocokan alokasi pembayaran ke tagihan, pengiriman invoice grup/sponsor, dan verifikasi bukti pembayaran.
6. **Pengaturan Layanan** (`/admin/residence-management` atau `/admin_layanan/residence-management`)
   - Pengelolaan daftar penerima KIP-K (roster), tarif arsip, dan data penghuni arsip.

### 2.2 Alur Mahasiswa Baru / SSO (`Pilih Layanan -> Lengkapi Data -> Review -> Ajukan`)
```
Login SSO / Akun Mahasiswa Baru
       │
       ▼
[/mahasiswa/layanan] Pilih Layanan Asrama
  ├── Pilih "Daftar Hunian" ──► [/mahasiswa/data-hunian] Wizard 3 Tahap:
  │                               1. Identitas (Ketik ulang Nama Lengkap, NIK 16 digit, No HP, Gender)
  │                               2. Akademik & Alamat (Fakultas, Departemen, Prodi, Provinsi, Kota, Alamat)
  │                               3. Review Data & Simpan
  │                                      │
  │                                      ▼
  │                             [/mahasiswa/registration] Pendaftaran Asrama:
  │                               Pilih Skema & Kamar -> Unggah Dokumen -> Review -> Ajukan
  │
  └── Pilih "Bebas Asrama"  ──► [/mahasiswa/bebas-asrama] Surat Keterangan Asrama:
                                  Lengkapi Data Dasar -> Pilih Jalur Verifikasi -> Ajukan Surat
```

---

## 3. Langkah Persiapan oleh Superadmin / Pengelola

Lakukan langkah berikut secara berurutan sebelum menjalankan skenario mahasiswa:

### Langkah 3.1 — Periksa Konfigurasi Master Gedung & Kamar
1. Login sebagai `uat.superadmin@unand.ac.id` (atau `uat.pengelola@unand.ac.id`).
2. Buka menu **Aset & Fasilitas -> Gedung & Kamar** (`/admin/kelola-bangunan`), lalu klik **Detail & Konfigurasi** pada gedung perempuan yang digunakan untuk UAT.
3. Pastikan konfigurasi pada gedung tersebut telah lengkap:
   - **Peruntukan Gender:** `Perempuan` (atau `Campur`).
   - **Kategori Penghuni yang Diizinkan:** Centang kategori yang akan diuji (`Lokal non-KIP-K`, `Lokal KIP-K`, `Mahasiswa Internasional`, `Summer Course`, `Umum / Non-Mahasiswa`).
   - **Tipe Kamar Aktif & Tarif Hunian:** Pastikan tipe kamar yang ada di gedung tersebut aktif dan memiliki tarif positif (`> 0`) untuk satuan **Tahunan** (termasuk **Tarif 1 Kamar Bersama** jika menguji teman sekamar), **Bulanan**, dan **Harian** (khusus Summer Course/Umum).
   - **Lantai & Kamar:** Pastikan lantai memiliki status **Booking Dibuka**, terdapat kamar berstatus `kosong` dengan kapasitas minimal **2 tempat** (untuk skenario teman sekamar), kamar kosong lain (untuk skenario mutasi), 1 kamar `penuh`, dan 1 kamar `maintenance`.

### Langkah 3.2 — Buka Pendaftaran Kategori (Tanpa Wajib Buat Periode Manual)
1. Buka menu **Pengelolaan Pendaftaran -> Buka / Tutup Pendaftaran** (`/admin/residence-workflow?section=opening`).
2. Klik kartu kategori **Lokal non-KIP-K**:
   - Periksa bagian **Gedung yang siap** — pastikan gedung perempuan uji muncul dengan badge `Siap` beserta daftar tarif dari Master Gedung & Kamar.
   - Jika ada gedung pada bagian **Gedung yang masih perlu dilengkapi**, klik tombol **Atur gedung** untuk melengkapi tarif/tipe kamar di Master Gedung, lalu kembali dan klik **Periksa ulang konfigurasi**.
   - Klik **(Opsional) Sesuaikan dokumen wajib & izin bulanan** bila ingin memeriksa daftar dokumen wajib (misal: `ktp,kk`) dan pastikan **Izinkan pengajuan bulanan sesuai syarat** dicentang.
   - Klik tombol **Buka Pendaftaran**.
   - *Verifikasi:* Status kartu kategori berubah menjadi **Dibuka**. Apabila sebelumnya belum ada periode penerimaan aktif di database, sistem secara otomatis membuat dan mengaktifkan periode tahun berjalan tanpa mengharuskan input periode manual.
3. Ulangi klik kartu kategori dan tekan **Buka Pendaftaran** untuk kategori:
   - **KIP-K** (pastikan dokumen wajib mencakup `perjanjian`).
   - **Internasional / S2 / S3**.
   - **Summer Course**.
   - **Umum**.

---

## 4. Skenario Pengujian Terperinci per Tahap

Jalankan satu skenario sampai tuntas sebelum berpindah ke skenario berikutnya. Untuk skenario yang saling eksklusif pada akun yang sama (misal: `uat.lokal` untuk sewa per orang vs kamar bersama), jalankan **Tahap 8 (Kamar Bersama)** terlebih dahulu atau gunakan akun/database uji yang direset terencana.

---

### Tahap 1 — Alur Masuk Pertama Kali: Pilih Layanan & Lengkapi Data Hunian (3 Tahap)
- **Aktor:** `uat.lokal@student.unand.ac.id`
- **Langkah Uji:**
  1. Login menggunakan `uat.lokal@student.unand.ac.id` (`password`).
  2. Buka halaman `/mahasiswa/layanan` (halaman tujuan otomatis pengguna baru yang belum memiliki pengajuan).
  3. Pastikan halaman tampil utuh (tidak blank) dengan 2 kartu pilihan: **Daftar Hunian** dan **Bebas Asrama**.
  4. Klik tombol **Lanjutkan Pendaftaran Hunian** pada kartu **Daftar Hunian** -> sistem mengarahkan ke `/mahasiswa/data-hunian`.
  5. **Tahap 1 (Identitas):**
     - Perhatikan kartu ringkasan akun sistem (NIM dan Email bersifat *read-only*).
     - Ketik ulang **Nama Lengkap Sesuai Identitas Resmi**, isi **NIK (16 digit angka)**, **Nomor HP Aktif**, dan pilih **Jenis Kelamin (`Perempuan`)**.
     - Coba klik **Lanjut** dengan NIK kurang dari 16 digit -> tombol tetap terkunci sampai 16 digit terpenuhi. Setelah valid, klik **Lanjut**.
  6. **Tahap 2 (Akademik dan Alamat):**
     - Pilih **Fakultas**, **Departemen**, dan **Program Studi (S1)**.
     - Pilih **Provinsi**, **Kota / Kabupaten**, dan isi **Alamat Domisili Lengkap**, lalu klik **Review Data**.
  7. **Tahap 3 (Review Data):**
     - Periksa ringkasan seluruh data yang baru diisi pada kartu review.
     - Klik **Simpan & Lanjutkan Pendaftaran**.
- **Hasil yang Harus Terlihat:**
  - Muncul notifikasi sukses *"Data pendaftaran tersimpan"* dan pengguna diarahkan ke halaman **Pendaftaran Asrama** (`/mahasiswa/registration`).
  - Role dan NIM pengguna tidak berubah meskipun ada manipulasi payload.

---

### Tahap 2 — Pendaftaran Reguler Mahasiswa Lokal Non-KIP-K
- **Aktor:** `uat.lokal@student.unand.ac.id`
- **Langkah Uji:**
  1. Pada halaman **Pendaftaran Asrama** (`/mahasiswa/registration`), pastikan informasi identitas dan akademik tampil pada ringkasan atas (dengan tombol **Ubah data diri** jika ingin merevisi).
  2. Pilih dasar tagihan **Per orang / tempat tidur** dan satuan tarif **Tahunan / Periode**.
  3. Pilih kamar yang berstatus tersedia pada katalog kamar gedung perempuan.
  4. Lanjutkan ke tahap konfirmasi dan klik **Ajukan Pendaftaran**.
- **Hasil yang Harus Terlihat:**
  - Pengajuan tercatat dengan status menunggu kelengkapan/verifikasi dokumen dan pembayaran.
  - Kamar tereservasi sementara (`reserved_room_id`) dan tagihan (`Tagihan`) terbentuk sesuai tarif tahunan gedung, namun status huni mahasiswa masih `calon` (belum menjadi penghuni fisik/aktif).

---

### Tahap 3 — Unggah Dokumen, Permintaan Revisi, dan Validasi Pengelola
- **Aktor:** `uat.lokal@student.unand.ac.id` & `uat.pengelola@unand.ac.id`
- **Langkah Uji:**
  1. Sebagai `uat.lokal@student.unand.ac.id`, buka halaman status/pendaftaran (`/mahasiswa/registration` atau `/mahasiswa/registration-status`), lalu unggah berkas PDF/JPG untuk setiap dokumen wajib (misal: `ktp`).
  2. Login sebagai `uat.pengelola@unand.ac.id`, buka sidebar **Pengelolaan Pendaftaran -> Daftar Pengajuan** (`/admin/residence-workflow`).
  3. Temukan kartu pengajuan `Mahasiswa UAT Lokal`. Pada bagian **Dokumen**, pilih status **Minta revisi**, isi catatan alasan (misal: *"Foto KTP buram, mohon unggah ulang"*), lalu simpan.
  4. Kembali ke akun `uat.lokal@student.unand.ac.id`, periksa bahwa status dokumen berubah menjadi `revision_requested` beserta catatan pengelola. Unggah ulang berkas perbaikan.
  5. Kembali ke akun `uat.pengelola@unand.ac.id`, periksa bahwa nomor versi dokumen bertambah (`v2`), lalu ubah status dokumen menjadi **Valid** dan simpan.
- **Hasil yang Harus Terlihat:**
  - Nomor versi dokumen (`v1` -> `v2`), nama pemeriksa, dan waktu pemeriksaan tercatat.
  - Selama dokumen masih `pending` atau `revision_requested`, tombol check-in fisik tetap terkunci oleh blocker `"Dokumen wajib belum seluruhnya valid"`.

---

### Tahap 4 — Rekonsiliasi Pembayaran Resmi DPUB (Bayar Penuh)
- **Aktor:** `uat.keuangan@unand.ac.id`
- **Langkah Uji:**
  1. Login sebagai `uat.keuangan@unand.ac.id`, buka sidebar **Pengelolaan Pendaftaran -> Rekonsiliasi & Invoice** (`/admin/residence-workflow?section=finance`).
  2. Pada panel **Rekonsiliasi pembayaran resmi DPUB**:
     - Isi **Referensi / rekening koran / laporan DPUB** (misal: `DPUB-UAT-001`).
     - Pilih Pembayar **Penghuni / pemohon (`resident`)**.
     - Isi **Jumlah diterima** sesuai nominal tagihan `uat.lokal`.
     - Pada baris alokasi tagihan, pilih tagihan milik `Mahasiswa UAT Lokal` dan isi nominal alokasi yang sama.
     - Klik **Rekonsiliasi dan bukukan**.
  3. Coba kirim ulang referensi dan alokasi yang persis sama (uji idempotensi).
- **Hasil yang Harus Terlihat:**
  - Tagihan `uat.lokal` berubah menjadi **Lunas (`lunas`)** dan transaksi keuangan tercatat tepat **satu kali** (tidak menggandakan saldo saat diklik ulang).
  - Status kesiapan pengajuan berubah menjadi **Siap check-in (`ready_at` terisi)** dan notifikasi dikirim ke mahasiswa, namun **penempatan kamar aktif belum terbentuk** sebelum serah kunci fisik.

---

### Tahap 5 — Check-in Fisik & Serah Kunci oleh Fasilitator
- **Aktor:** `uat.fasilitator@unand.ac.id`
- **Langkah Uji:**
  1. Login sebagai `uat.fasilitator@unand.ac.id`, buka menu **Pengelolaan Pendaftaran -> Daftar Pengajuan** (`/admin/residence-workflow`).
  2. Temukan pengajuan `Mahasiswa UAT Lokal` yang sudah berstatus **Siap check-in**.
  3. Coba kirim form **Check-in dan serahkan kunci** tanpa mencentang seluruh kotak konfirmasi fisik -> sistem menolak.
  4. Centang ketiga konfirmasi wajib:
     - `Identitas fisik sesuai pendaftar`
     - `Berkas asli sesuai dokumen yang divalidasi`
     - `Kunci kamar diserahkan dan penghuni masuk kamar`
  5. Klik **Check-in dan serahkan kunci**, lalu coba ulangi aksi yang sama sekali lagi.
- **Hasil yang Harus Terlihat:**
  - Status pengajuan selesai (`completed_at` & `checked_in_at` terisi), status huni profil mahasiswa berubah menjadi **`aktif`**, dan terbentuk tepat **1 record `PenempatanKamar` aktif** beserta histori `checked_in` (mengulangi aksi tidak membuat penempatan ganda).

---

### Tahap 6 — Pendaftaran KIP-K: Alokasi Otomatis & Check-in Sebelum Pencairan
- **Aktor:** `uat.kipk@student.unand.ac.id`, `uat.pengelola@unand.ac.id`, `uat.fasilitator@unand.ac.id`
- **Langkah Uji:**
  1. Login sebagai `uat.kipk@student.unand.ac.id`, lengkapi data di `/mahasiswa/layanan` -> `/mahasiswa/data-hunian`, lalu masuk ke `/mahasiswa/registration`.
  2. Ajukan pendaftaran sebagai mahasiswa **KIP-K** (tanpa memilih kamar manual dan tanpa memilih teman sekamar).
  3. Unggah dokumen wajib termasuk **Dokumen Perjanjian Pembayaran Setelah Pencairan (`perjanjian`)**.
  4. Sebagai `uat.pengelola@unand.ac.id`, buka **Daftar Pengajuan**, validasi seluruh dokumen `uat.kipk`.
  5. Sebagai `uat.fasilitator@unand.ac.id`, lakukan **Check-in dan serahkan kunci** untuk `uat.kipk` meskipun dana KIP-K belum cair (`total_dibayar = 0`).
- **Hasil yang Harus Terlihat:**
  - Sistem mengalokasikan kamar secara otomatis berdasarkan prioritas gedung/lantai KIP-K (atau memasukkan ke antrean `waitlisted` tanpa tagihan ganda apabila seluruh kamar penuh).
  - Kewajiban tagihan tetap tercatat sebagai piutang pribadi (`funding = personal`, `sponsor_total = 0`).
  - Dengan dokumen perjanjian yang valid, `uat.kipk` diizinkan check-in sebelum pencairan dana dan tercatat dengan klasifikasi **`binaan`**.

---

### Tahap 7 — Pencatatan Pencairan KIP-K & Rekonsiliasi Pembayaran
- **Aktor:** `uat.pengelola@unand.ac.id` & `uat.keuangan@unand.ac.id`
- **Langkah Uji:**
  1. Sebagai `uat.pengelola@unand.ac.id`, buka kartu pengajuan `uat.kipk` di **Daftar Pengajuan**.
  2. Pada bagian **Pencairan KIP-K**, isi tanggal pencairan dan tanggal jatuh tempo pembayaran, lalu klik **Catat pencairan KIP-K**.
  3. Periksa bahwa pencatatan jadwal pencairan **tidak otomatis mengurangi piutang tagihan**.
  4. Sebagai `uat.keuangan@unand.ac.id`, buka **Rekonsiliasi & Invoice**, catat penerimaan resmi DPUB untuk tagihan `uat.kipk`.
- **Hasil yang Harus Terlihat:**
  - Piutang tagihan `uat.kipk` baru berkurang/lunas setelah direkonsiliasi terhadap penerimaan resmi DPUB.

---

### Tahap 8 — Kamar Bersama (Undangan Teman Sekamar & Penerbitan Tagihan Gabungan)
> **Catatan:** Gunakan pendaftar non-KIP-K yang belum memiliki kontrak per orang (atau reset pengajuan `uat.lokal` pada lingkungan uji).

- **Aktor:** `uat.lokal@student.unand.ac.id`, `uat.teman@student.unand.ac.id`, `uat.pengelola@unand.ac.id`
- **Langkah Uji:**
  1. Login sebagai `uat.teman@student.unand.ac.id`, selesaikan pengisian **Pilih Layanan -> Lengkapi Data Hunian** (`/mahasiswa/data-hunian`) agar profil `uat.teman` siap menerima undangan.
  2. Login sebagai `uat.lokal@student.unand.ac.id`, pada halaman **Pendaftaran Asrama** (`/mahasiswa/registration`):
     - Pilih dasar tagihan **Satu kamar bersama (`room`)** pada kamar berkapasitas minimal 2 orang.
     - Kirim pengajuan, lalu pada panel **Undangan Teman Sekamar**, masukkan NIM `uat.teman` (`2611529003`) dan kirim undangan.
  3. Login kembali sebagai `uat.teman@student.unand.ac.id`, buka `/mahasiswa/registration`, lihat undangan kamar bersama yang masuk, lalu klik **Terima Undangan**.
  4. Login sebagai `uat.pengelola@unand.ac.id`, buka **Pengelolaan Pendaftaran -> Daftar Pengajuan** (`/admin/residence-workflow`).
  5. Perhatikan panel **Kamar bersama menunggu penerbitan tagihan** di bagian atas halaman:
     - Pastikan nama `Mahasiswa UAT Lokal` dan `Mahasiswa UAT Teman Sekamar` tampil dalam satu kelompok kamar yang sama.
     - Centang kedua anggota tersebut dan klik **Terbitkan tagihan kamar bersama**.
- **Hasil yang Harus Terlihat:**
  - Terbentuk satu `RoomContract` yang mengikat kedua pendaftar pada kamar yang sama.
  - Tarif tahunan 1 kamar (`room_amount`) dibagi rata secara presisi ke tagihan masing-masing anggota (misal: tarif kamar Rp10.000.000 dibagi 2 anggota = Rp5.000.000 per orang).

---

### Tahap 9 — Pengajuan Cicilan (Permohonan Mahasiswa -> ACC Pimpinan -> Termin Pengelola -> Perjanjian)
- **Aktor:** Mahasiswa belum check-in, `uat.pimpinan@unand.ac.id`, `uat.pengelola@unand.ac.id`, `uat.keuangan@unand.ac.id`
- **Langkah Uji:**
  1. Sebagai mahasiswa yang memiliki pengajuan aktif (belum check-in), buka detail pengajuan lalu pada form **Ajukan cicilan atau penundaan pembayaran**, pilih **Cicilan (`installment`)**, isi alasan, dan klik **Kirim permohonan**.
  2. Login sebagai `uat.pimpinan@unand.ac.id`, buka **Pengelolaan Pendaftaran -> Daftar Pengajuan**. Pada kartu pengajuan tersebut, temukan permohonan `installment (pending)`, pilih **Setujui**, isi catatan pimpinan, dan simpan.
  3. Periksa bahwa **ACC pimpinan saja belum membuat mahasiswa siap check-in** (`requires_configuration = true`).
  4. Login sebagai `uat.pengelola@unand.ac.id`, buka kartu pengajuan yang sama. Tetapkan **Uang awal (Rp)** dan rincian baris **Termin cicilan** (nominal + tanggal jatuh tempo), lalu klik **Simpan skema cicilan**.
  5. Sebagai mahasiswa, unggah dokumen **Perjanjian keputusan (`agreement_kind`)** yang diminta, lalu validasi dokumen tersebut menggunakan akun `uat.pengelola@unand.ac.id`.
  6. Sebagai `uat.keuangan@unand.ac.id`, rekonsiliasi pembayaran sebesar **Uang awal / termin pertama**.
- **Hasil yang Harus Terlihat:**
  - Setelah pimpinan ACC + pengelola menetapkan jadwal termin + dokumen perjanjian divalidasi + uang awal dibayar, status berubah menjadi **Siap check-in**.
  - Status tagihan menjadi **`sebagian`** dan sisa utang termin berikutnya tetap tercatat utuh di `jadwal_cicilan`.

---

### Tahap 10 — Penolakan Cicilan & Persetujuan Penundaan Pembayaran (`Deferral`)
- **Aktor:** Mahasiswa belum check-in, `uat.pimpinan@unand.ac.id`, `uat.pengelola@unand.ac.id`
- **Langkah Uji:**
  1. **Uji Penolakan:** Ajukan permohonan `installment` atau `defer`, lalu tolak menggunakan akun `uat.pimpinan@unand.ac.id`. Pastikan mahasiswa tetap wajib melunasi tagihan reguler sebelum bisa check-in.
  2. **Uji Penundaan (`defer`) dengan Uang Awal Rp0:**
     - Mahasiswa mengajukan **Penundaan pembayaran (`defer`)**.
     - Coba setujui langsung menggunakan akun `uat.pengelola@unand.ac.id` -> harus **ditolak (`403 Forbidden`)** karena penundaan tanpa uang awal wajib disetujui `pimpinan` terlebih dahulu.
     - Login sebagai `uat.pimpinan@unand.ac.id`, setujui permohonan penundaan.
     - Login sebagai `uat.pengelola@unand.ac.id`, tetapkan uang awal `0` dan tanggal jatuh tempo pelunasan pada jadwal termin.
     - Mahasiswa mengunggah dokumen perjanjian penundaan dan pengelola memvalidasinya.
- **Hasil yang Harus Terlihat:**
  - Mahasiswa menjadi **Siap check-in** dengan `total_dibayar = 0`, namun seluruh nilai tagihan tetap tercatat sebagai piutang yang wajib dilunasi sesuai jatuh tempo.

---

### Tahap 11 — Skema Bulanan untuk Mahasiswa Non-Maba (`uat.bulanan`)
- **Aktor:** `uat.bulanan@student.unand.ac.id`, `uat.pengelola@unand.ac.id`, `uat.keuangan@unand.ac.id`
- **Langkah Uji:**
  1. Login sebagai `uat.bulanan@student.unand.ac.id` (angkatan 2025 / non-maba), lengkapi data di `/mahasiswa/layanan` -> `/mahasiswa/data-hunian`, lalu ajukan pendaftaran dengan satuan tarif **Bulanan (`month`)** beserta tanggal mulai dan tanggal akhir sewa.
  2. Sebagai perbandingan, coba kirim request pendaftaran bulanan menggunakan akun mahasiswa baru angkatan 2026 (`uat.lokal`) -> sistem wajib **menolak** dengan error validasi `rate_unit`.
  3. Login sebagai `uat.pengelola@unand.ac.id`, buka **Daftar Pengajuan**, setujui keputusan `monthly` dengan menetapkan pembayaran bulan pertama (`initial_amount > 0`) dan jadwal jatuh tempo per bulan.
  4. Validasi dokumen wajib dan rekonsiliasi pembayaran bulan pertama melalui `uat.keuangan@unand.ac.id`.
- **Hasil yang Harus Terlihat:**
  - Pengajuan bulanan mahasiswa non-maba disetujui dan siap check-in setelah bulan pertama dibayar.

---

### Tahap 12 — Pendaftaran Mahasiswa Pascasarjana S2 & S3 Mandiri (Tanpa Surat Institusi/IO)
- **Aktor:** `uat.pengelola@unand.ac.id` (menggunakan data `uat.s2@student.unand.ac.id` dan `uat.s3@student.unand.ac.id`)
- **Langkah Uji:**
  1. Login sebagai `uat.pengelola@unand.ac.id`, buka menu **Pengelolaan Pendaftaran -> Permohonan Institusi & Kegiatan** (`/admin/residence-workflow?section=applications`).
  2. Pada bagian **Identitas permohonan**:
     - Isi Nomor permohonan (misal: `PG-S2-001`).
     - Pilih Jenis **Mahasiswa S2 / S3 mandiri (`postgraduate`)**.
     - Perhatikan bahwa kolom **Institusi / Fakultas / Penyelenggara** dan **Surat Permohonan** otomatis disembunyikan (tidak wajib untuk S2/S3 mandiri).
  3. Isi email tujuan invoice (`uat.s2@student.unand.ac.id`), rencana tanggal mulai & selesai, serta pada **Daftar peserta** masukkan Nama, NIM (`2621529005`), Email (`uat.s2@student.unand.ac.id`), Gender (`Perempuan`), Prodi jenjang **S2**, dan pilih kamar.
  4. Klik **Simpan permohonan dan peserta**. Ulangi untuk `uat.s3@student.unand.ac.id` (`2631529006`, Prodi jenjang **S3**).
  5. Coba pilih Prodi jenjang **S1** pada jenis `postgraduate` -> sistem wajib menolak.
- **Hasil yang Harus Terlihat:**
  - Akun mahasiswa `uat.s2` dan `uat.s3` yang sudah ada langsung terhubung ke pengajuan tanpa menggandakan akun dan tanpa mewajibkan surat IO/institusi.
  - Tagihan pribadi terbentuk dan proses check-in tetap mengikuti syarat dokumen serta pembayaran.

---

### Tahap 13 — Permohonan Mahasiswa Internasional (Sponsor & Upgrade Kamar Pribadi)
- **Aktor:** `uat.pengelola@unand.ac.id` (menggunakan data `uat.internasional@student.unand.ac.id`)
- **Langkah Uji:**
  1. Pada menu **Permohonan Institusi & Kegiatan** (`/admin/residence-workflow?section=applications`), pilih Jenis **Mahasiswa internasional (`international`)**.
  2. Pastikan kolom **Institusi** dan **Surat Permohonan** wajib diisi.
  3. Pilih Pembiayaan **Sponsor dengan upgrade dibayar penghuni (`mixed`)**, isi batas tanggungan sponsor per peserta (`sponsor_cap`), unggah surat permohonan PDF, dan masukkan data peserta `uat.internasional@student.unand.ac.id` (`2699009007`).
  4. Klik **Simpan permohonan dan peserta**.
  5. Pada daftar permohonan di bawahnya, centang **Dokumen pendukung penempatan telah diperiksa** dan klik **Setujui penempatan**.
- **Hasil yang Harus Terlihat:**
  - Tagihan memisahkan dengan tegas nilai **Tanggungan Sponsor (`sponsor_total`)** dan **Kewajiban Pribadi/Upgrade (`total`)**.
  - Persetujuan penempatan memungkinkan peserta check-in setelah kewajiban pribadinya terpenuhi, namun **piutang sponsor tetap tercatat belum lunas (`sponsor_paid = 0`)** sampai direkonsiliasi oleh keuangan.

---

### Tahap 14 — Kegiatan / Summer Course (Multi-Peserta, Check-in Bertahap, & Rekonsiliasi Sponsor)
- **Aktor:** `uat.pengelola@unand.ac.id`, `uat.keuangan@unand.ac.id`, `uat.fasilitator@unand.ac.id`
- **Langkah Uji:**
  1. Pada menu **Permohonan Institusi & Kegiatan**, pilih Jenis **Summer Course (`summer_course`)**, Pembiayaan **Ditanggung penyelenggara / institusi (`sponsor`)**, Satuan tarif **Harian (`day`)**, isi rentang tanggal kegiatan, unggah surat resmi, dan tambahkan 2 peserta pada **Daftar peserta**.
  2. Klik **Simpan permohonan dan peserta** -> periksa bahwa peserta belum otomatis tercatat hadir/menempati kamar (`completed_at = null`) saat permohonan baru dibuat.
  3. Setujui penempatan permohonan, validasi dokumen peserta, lalu lakukan **Check-in dan serahkan kunci** melalui `uat.fasilitator@unand.ac.id` untuk peserta yang hadir fisik.
  4. Buka **Rekonsiliasi & Invoice** (`/admin/residence-workflow?section=finance`), kirim **Invoice grup/sponsor** melalui tombol **Kirim email**, lalu catat rekonsiliasi pembayaran dengan jenis pembayar **Sponsor / institusi (`sponsor`)**.
- **Hasil yang Harus Terlihat:**
  - Setiap peserta terhubung ke kamar dan tagihan masing-masing, check-in dilakukan per peserta yang datang secara fisik, dan pelunasan sponsor dibukukan secara akurat ke buku besar keuangan.

---

### Tahap 15 — Penyewa Umum / Non-Mahasiswa
- **Aktor:** `uat.pengelola@unand.ac.id`, `uat.pimpinan@unand.ac.id`, `uat.keuangan@unand.ac.id`, `uat.fasilitator@unand.ac.id`
- **Langkah Uji:**
  1. Coba akses endpoint pembuatan penyewa umum menggunakan akun `uat.fasilitator@unand.ac.id` -> harus **ditolak (`403 Forbidden`)**.
  2. Login sebagai `uat.pengelola@unand.ac.id`, buka menu **Pengelolaan Pendaftaran -> Penyewa Umum** (`/admin/residence-workflow?section=public`).
  3. Isi identitas pemohon umum, pilih kamar, satuan tarif (`Harian` atau `Bulanan`), dan tanggal mulai/selesai, lalu klik **Buat pengajuan umum**.
  4. Buka **Daftar Pengajuan**, unggah **Bukti transfer penyewa umum** dan klik **Sahkan bukti dan izinkan penempatan** (atau ajukan penundaan pembayaran yang memerlukan ACC `pimpinan`).
  5. Periksa bahwa pengunggahan bukti transfer mengizinkan alokasi/penempatan operasional tetapi **tidak otomatis dianggap lunas di buku besar** sebelum direkonsiliasi dengan laporan resmi DPUB oleh `uat.keuangan@unand.ac.id`.
- **Hasil yang Harus Terlihat:**
  - Pemisahan tegas antara bukti transfer pemohon dan rekonsiliasi kas resmi DPUB.

---

### Tahap 16 — Revisi Kontrak Kamar Bersama & Mutasi Kamar Penghuni
- **Aktor:** `uat.pengelola@unand.ac.id` & `uat.fasilitator@unand.ac.id`
- **Langkah Uji:**
  1. **Revisi Anggota Kontrak Kamar Bersama:**
     - Pada kartu pengajuan yang memiliki kontrak kamar bersama di **Daftar Pengajuan**, buka bagian **Perubahan kontrak dan mutasi kamar**.
     - Unggah dokumen persetujuan tertulis seluruh anggota, sesuaikan daftar anggota kontrak, isi alasan revisi, dan klik **Revisi kontrak kamar**.
     - Periksa bahwa pembayaran anggota yang sudah masuk tetap terpelihara, kewajiban per anggota dihitung ulang secara atomik, dan kelebihan bayar tercatat sebagai kredit (`credits`) serta bukti dokumen amandemen dapat diunduh.
  2. **Mutasi / Pindah Kamar:**
     - Pilih kamar tujuan yang kosong dan layak, isi alasan mutasi, unggah dokumen persetujuan (wajib bila keluar dari kontrak kamar bersama), centang **Kunci lama diterima dan kunci baru diserahkan** serta **Kamar tujuan siap ditempati**, lalu klik **Simpan mutasi kamar**.
- **Hasil yang Harus Terlihat:**
  - Penempatan kamar berpindah secara atomik, selisih tarif/kredit tercatat pada tagihan, histori `room_moved` beserta dokumen amandemen terbentuk, dan pengulangan request dengan referensi yang sama tidak menggandakan mutasi.

---

### Tahap 17 — Akhir Masa Tinggal: Inspeksi GO & Pengembalian Kunci Fisik
- **Aktor:** `uat.inspeksi@unand.ac.id` & `uat.fasilitator@unand.ac.id`
- **Langkah Uji:**
  1. Pastikan tanggal akhir masa tinggal (`ends_at`) penghuni telah tiba. Periksa bahwa **berakhirnya tanggal sewa tidak otomatis mengosongkan status kamar** sebelum kunci fisik dikembalikan.
  2. Pada kartu pengajuan di **Daftar Pengajuan**, klik **Ajukan inspeksi check-out**.
  3. Login sebagai petugas GO (`uat.inspeksi@unand.ac.id`), buka menu **Inspeksi -> Inspeksi Check-out**, periksa kondisi aset kamar, dan selesaikan inspeksi.
  4. Login kembali sebagai `uat.fasilitator@unand.ac.id`, buka kartu pengajuan di **Daftar Pengajuan**:
     - Pilih kondisi kamar (`Baik dan siap pakai` atau `Ada kerusakan / perlu perbaikan`), isi catatan pemeriksaan, centang **Kunci fisik telah diterima kembali** dan **Kamar sudah kosong dan diperiksa**, lalu klik **Konfirmasi kunci kembali**.
- **Hasil yang Harus Terlihat:**
  - Penempatan kamar berakhir (`status = berakhir`), histori `checked_out` tercatat satu kali, dan status kamar menjadi `kosong` (atau `maintenance` apabila dipilih ada kerusakan).

---

### Tahap 18 — Pemeriksaan Konsistensi Rekap & Dashboard
- **Aktor:** `uat.pimpinan@unand.ac.id` & `uat.keuangan@unand.ac.id`
- **Langkah Uji:**
  1. Buka **Pengelolaan Pendaftaran -> Daftar Pengajuan** (`/admin/residence-workflow`) dan perhatikan kartu metrik di bagian atas halaman.
  2. Bandingkan angka **Pendaftar**, **Alokasi kamar**, **Siap check-in**, **Penghuni fisik**, **Piutang penghuni**, **Piutang sponsor**, dan **Kredit perubahan** dengan transaksi yang baru dijalankan.
- **Hasil yang Harus Terlihat:**
  - Setiap metrik merepresentasikan tahapan yang berbeda secara akurat (pembayaran lunas tidak dihitung sebagai penghuni fisik sebelum serah kunci; persetujuan sponsor tidak menghapus piutang sponsor sebelum rekonsiliasi).

---

## 5. Daftar Pemeriksaan Penolakan & Keamanan (Checklist P01–P12)

| Kode | Skenario Pemeriksaan Negatif / Keamanan | Hasil Wajib |
| --- | --- | --- |
| **P01** | Mahasiswa baru mencoba mengakses halaman pendaftaran tanpa melengkapi NIK 16 digit, nama resmi, no HP, prodi, dan alamat di `/mahasiswa/data-hunian`. | Ditolak validasi; diarahkan melengkapi profil pendaftaran terlebih dahulu. |
| **P02** | Pengelola menekan **Buka Pendaftaran** pada kategori yang gedungnya belum memiliki tipe kamar aktif atau tarif positif. | Tombol buka pendaftaran terkunci / server menolak dengan pesan gedung yang belum siap. |
| **P03** | Fasilitator mencoba melakukan check-in sebelum dokumen wajib seluruhnya `valid` atau sebelum pembayaran/persetujuan pembiayaan terpenuhi. | Server menolak check-in dan menampilkan daftar blocker yang belum terpenuhi. |
| **P04** | Fasilitator B (`uat.fasilitator2@unand.ac.id`) mencoba memproses check-in, mutasi, atau serah kunci penghuni di gedung Fasilitator A. | Server menolak akses (`403 Forbidden`). |
| **P05** | Mahasiswa mencoba mengunduh berkas dokumen pendaftaran atau bukti amandemen milik mahasiswa lain melalui URL langsung. | Server menolak akses (`403 Forbidden`). |
| **P06** | Pengelola (`admin_layanan`) mencoba menyetujui langsung penundaan pembayaran (`defer`) dengan uang awal Rp0 tanpa persetujuan `pimpinan` terlebih dahulu. | Server menolak (`403 Forbidden`). |
| **P07** | Mahasiswa baru (angkatan tahun berjalan) memanipulasi request pendaftaran agar memakai satuan tarif `month` (bulanan). | Server menolak dengan error validasi `rate_unit`. |
| **P08** | Dua pendaftar mengirim request memilih tempat terakhir pada kamar yang sama secara bersamaan. | Kunci transaksi (`lockForUpdate`) memastikan kapasitas kamar tidak pernah terlampaui. |
| **P09** | Petugas menekan tombol **Check-in**, **Konfirmasi kunci kembali**, **Mutasi kamar**, atau **Rekonsiliasi DPUB** dua kali berturut-turut. | Bersifat idempoten: tidak menggandakan penempatan kamar, pembayaran, transaksi buku besar, maupun histori. |
| **P10** | Pengelola memperbarui tarif atau menutup pendaftaran pada **Buka / Tutup Pendaftaran** setelah ada pendaftar yang sudah mengajukan. | Pengajuan yang sedang berjalan tetap mengacu pada snapshot versi kebijakan (`ResidencePolicy`) saat pengajuan dibuat. |
| **P11** | Pengelola memasukkan peserta berjenjang S1 pada formulir jenis **Mahasiswa S2 / S3 mandiri (`postgraduate`)** atau mengosongkan surat pada jenis **Internasional**. | Server menolak dengan pesan validasi yang spesifik. |
| **P12** | Fasilitator mencoba membuat pengajuan **Penyewa Umum** secara langsung. | Server menolak (`403 Forbidden`); alokasi penyewa umum hanya dapat dibuat oleh pengelola layanan. |

---

## 6. Lembar Pencatatan Hasil UAT

| Tahap / Kode | Penguji & Tanggal | Akun yang Dipakai | ID Registrasi / Nomor Tagihan | Bukti & Hasil Aktual | Status (Lulus / Gagal / Belum Diuji) |
| --- | --- | --- | --- | --- | --- |
| Tahap 1 | | `uat.lokal@student.unand.ac.id` | | | |
| Tahap 2 | | `uat.lokal@student.unand.ac.id` | | | |
| Tahap 3 | | `uat.lokal` & `uat.pengelola` | | | |
| Tahap 4 | | `uat.keuangan@unand.ac.id` | | | |
| Tahap 5 | | `uat.fasilitator@unand.ac.id` | | | |
| Tahap 6 | | `uat.kipk@student.unand.ac.id` | | | |
| Tahap 7 | | `uat.pengelola` & `uat.keuangan` | | | |
| Tahap 8 | | `uat.lokal`, `uat.teman`, `uat.pengelola` | | | |
| Tahap 9 | | Mahasiswa, `uat.pimpinan`, `uat.pengelola` | | | |
| Tahap 10 | | Mahasiswa, `uat.pimpinan`, `uat.pengelola` | | | |
| Tahap 11 | | `uat.bulanan@student.unand.ac.id` | | | |
| Tahap 12 | | `uat.pengelola` (`uat.s2` & `uat.s3`) | | | |
| Tahap 13 | | `uat.pengelola` (`uat.internasional`) | | | |
| Tahap 14 | | `uat.pengelola`, `uat.keuangan`, `uat.fasilitator` | | | |
| Tahap 15 | | `uat.pengelola`, `uat.keuangan`, `uat.fasilitator` | | | |
| Tahap 16 | | `uat.pengelola` & `uat.fasilitator` | | | |
| Tahap 17 | | `uat.inspeksi` & `uat.fasilitator` | | | |
| Tahap 18 | | `uat.pimpinan` & `uat.keuangan` | | | |

> Dokumen ini merupakan panduan pemeriksaan UAT terperinci. Catat setiap temuan konfigurasi atau deviasi perilaku aktual beserta tangkapan layar pada kolom bukti.
