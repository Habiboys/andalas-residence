# Rekap akun uji coba Andalas Residence

Disusun pada 24 September 2026 berdasarkan definisi seeder proyek. Daftar ini menjelaskan kondisi awal saat akun dibuat, bukan pembacaan ulang kondisi database setelah pengujian.

## Login dan password

- Login menggunakan email pada tabel di bawah.
- Angkatan dibaca dari field `angkatan` profil. NIM mahasiswa demo diawali dua digit tahun angkatan: `26` untuk 2026 dan `25` untuk 2025. Angka berikutnya adalah nomor sintetis untuk pengujian, bukan kode resmi program studi.
- Seeding ulang memperbaiki NIM bawaan lama (`DEMO-xxxx`, NIM awal `22...`, dan `INT001`) tanpa mengganti NIM yang sudah disunting penguji. Akun nonmahasiswa dan petugas tidak mengikuti format NIM mahasiswa.
- **Password awal seluruh akun seeder: `password`**.
- Gunakan akun **`@example.test`** untuk skenario lengkap yang saling terhubung.
- Seeder menyediakan **63 akun skenario**: 9 akun petugas/orang tua dan 54 akun client. Terdapat juga **14 akun awal** dari seeder dasar, sehingga total definisi akun adalah **77 akun**.
- Jika password, nama, atau status sudah diubah saat pengujian, seeding ulang tidak mengembalikannya ke nilai awal.
- Akun `surat-modern@example.test` dan `legacy-surat-terbit@example.test` sengaja berstatus **nonaktif** setelah penerbitan surat. Keduanya bukan akun penghuni aktif untuk memulai transaksi baru.

## Akun petugas dan orang tua

| No. | Email | NIM/NIP | Peran | Kegunaan |
| --- | --- | --- | --- | --- |
| 1 | `superadmin@example.test` | `DEMO-STAFF-0` | Superadmin | Seluruh pengelolaan, akun internal, dan audit log |
| 2 | `pimpinan@example.test` | `DEMO-STAFF-1` | Pimpinan | Dashboard, laporan keuangan/aset, dan pemantauan kerusakan |
| 3 | `staff_admin@example.test` | `DEMO-STAFF-2` | Staff administrasi | Data master, mahasiswa, keuangan, dan konten landing |
| 4 | `admin_layanan@example.test` | `DEMO-STAFF-3` | Admin layanan | Review pendaftaran, penempatan, pembayaran, cicilan, dan surat bebas asrama |
| 5 | `admin_aset@example.test` | `DEMO-STAFF-4` | Admin aset | Gedung, kamar, stok, lokasi, dan jumlah aset |
| 6 | `fasilitator@example.test` | `DEMO-STAFF-5` | Fasilitator | Kegiatan, QR absensi, perizinan, dan penyelesaian checkout untuk DEMO-P/DEMO-W |
| 7 | `teknisi@example.test` | `DEMO-STAFF-6` | Teknisi | Tiket kerusakan, pengerjaan, bukti penyelesaian, dan riwayat penilaian |
| 8 | `go@example.test` | `DEMO-STAFF-7` | GO / Cleaning Service | Pemeriksaan kamar dan jumlah/kondisi aset sebelum checkout |
| 9 | `orang_tua@example.test` | `DEMO-STAFF-8` | Orang tua | Pemantauan anak yang terhubung: binaan-aktif@example.test |

Fasilitator demo hanya ditugaskan ke gedung **DEMO-P** dan **DEMO-W**. Gedung **DEMO-T** disediakan untuk menguji pembatasan akses lintas gedung.

## Akun client per skenario

Seluruh akun pada tabel ini memakai role sistem `mahasiswa`, termasuk client internasional dan nonmahasiswa. Kategori client tetap dibedakan sesuai kolom kategori.

| No. | Email | NIM/NIP | Kategori | Kondisi awal dan pengujian |
| --- | --- | --- | --- | --- |
| 1 | `daftar-draft@example.test` | `2699000001` | Lokal non-KIPK | Draft pendaftaran; lanjutkan pengajuan |
| 2 | `daftar-review@example.test` | `2699000002` | Lokal non-KIPK | Pendaftaran submitted; review oleh admin layanan |
| 3 | `daftar-ditolak@example.test` | `2699000003` | Lokal non-KIPK | Pendaftaran ditolak; tagihan dibatalkan; perbaiki dan ajukan ulang |
| 4 | `tagihan-belum-bayar@example.test` | `2699000004` | Lokal non-KIPK | Tagihan belum dibayar dan sudah melewati jatuh tempo saat seed |
| 5 | `bayar-verifikasi@example.test` | `2699000005` | Lokal non-KIPK | Bukti pembayaran menunggu verifikasi admin; pendaftaran masih verified |
| 6 | `bayar-ditolak@example.test` | `2699000006` | Lokal non-KIPK | Pembayaran ditolak; baca alasan dan unggah pembayaran yang sesuai |
| 7 | `cicilan-pengajuan@example.test` | `2699000007` | Lokal non-KIPK | Permohonan cicilan menunggu penetapan jadwal oleh admin |
| 8 | `cicilan-aktif@example.test` | `2699000008` | Lokal non-KIPK | Penghuni aktif; termin pertama lunas, termin kedua belum dibayar |
| 9 | `binaan-aktif@example.test` | `2699000009` | Lokal non-KIPK | Penghuni tahun pertama; memenuhi kelayakan absensi saat seed; terhubung ke orang tua demo |
| 10 | `kipk-penempatan@example.test` | `2699000010` | Lokal KIPK | Tagihan nol dengan subsidi KIPK; menunggu penerimaan dan penempatan admin |
| 11 | `kipk-aktif@example.test` | `2699000011` | Lokal KIPK | Penghuni aktif, tagihan nol; memenuhi kelayakan absensi saat seed |
| 12 | `internasional-gratis@example.test` | `2699000012` | Internasional fasilitas gratis | Penghuni aktif; tagihan nol karena subsidi; bukan mahasiswa binaan |
| 13 | `internasional-bayar@example.test` | `2699000013` | Internasional berbayar | Penghuni aktif dengan pembayaran lunas; bukan mahasiswa binaan |
| 14 | `nonmahasiswa-aktif@example.test` | `DEMO-0014` | Nonmahasiswa | Penghuni aktif tanpa program studi; bukan mahasiswa binaan |
| 15 | `penghuni-lama@example.test` | `2599000015` | Penghuni lokal lama | Angkatan 2025, pernah checkout dan masuk kembali; tidak berhak absensi binaan |
| 16 | `checkout-pengajuan@example.test` | `2699000016` | Lokal non-KIPK | Pengajuan checkout menunggu pemeriksaan GO |
| 17 | `checkout-siap@example.test` | `2699000017` | Lokal non-KIPK | Inspeksi selesai; siap diselesaikan fasilitator |
| 18 | `checkout-rusak@example.test` | `2699000018` | Lokal non-KIPK | Inspeksi selesai dengan temuan kerusakan dan tiket terkait; siap checkout |
| 19 | `checkout-selesai@example.test` | `2699000019` | Lokal non-KIPK | Sudah checkout; akun masih aktif untuk mengajukan surat bebas asrama |
| 20 | `surat-modern@example.test` | `2699000020` | Lokal non-KIPK | Checkout selesai dan surat modern sudah terbit; akun NONAKTIF |
| 21 | `legacy-lunas@example.test` | `2599000021` | Alumni lokal angkatan 2025 | Pengajuan alumni lunas dengan bukti pembayaran dan rekening koran; menunggu persetujuan |
| 22 | `legacy-belum-lunas@example.test` | `2599000022` | Alumni lokal angkatan 2025 | Klasifikasi alumni belum lunas sudah diverifikasi; invoice tersedia untuk dibayar |
| 23 | `legacy-bukan-alumni@example.test` | `2599000023` | Mahasiswa angkatan 2025 | Mengajukan surat tanpa riwayat hunian; admin perlu memverifikasi klasifikasi bukan alumni |
| 24 | `legacy-ditolak@example.test` | `2599000024` | Alumni lokal angkatan 2025 | Pengajuan surat ditolak karena bukti belum sesuai; uji perbaikan dokumen |
| 25 | `legacy-surat-terbit@example.test` | `2599000025` | Client legacy angkatan 2025 | Sudah diverifikasi sebagai bukan alumni dan surat terbit; akun NONAKTIF |
| 26 | `izin-otomatis@example.test` | `2699000026` | Lokal non-KIPK | Enam izin sebelumnya selesai; izin ketujuh otomatis sedang_izin; unggah bukti sampai |
| 27 | `izin-review@example.test` | `2699000027` | Lokal non-KIPK | Tujuh izin sebelumnya selesai; izin kedelapan menunggu keputusan fasilitator |
| 28 | `izin-sampai@example.test` | `2699000028` | Lokal non-KIPK | Sudah mengunggah bukti sampai di tujuan; lanjutkan bukti kembali |
| 29 | `izin-terlambat@example.test` | `2699000029` | Lokal non-KIPK | Sudah sampai di tujuan tetapi melewati rencana kembali; uji monitoring keterlambatan |
| 30 | `izin-kembali@example.test` | `2699000030` | Lokal non-KIPK | Izin sudah selesai kembali, lengkap dengan foto dan lokasi |
| 31 | `penghuni-01@example.test` | `2699000031` | Lokal non-KIPK | Tiket menunggu triage |
| 32 | `penghuni-02@example.test` | `2699000032` | Lokal non-KIPK | Tiket sudah didisposisikan ke teknisi |
| 33 | `penghuni-03@example.test` | `2699000033` | Lokal non-KIPK | Tiket sedang dikerjakan |
| 34 | `penghuni-04@example.test` | `2699000034` | Lokal non-KIPK | Tiket selesai, foto sesudah tersedia, dan penilaian teknisi final |
| 35 | `penghuni-05@example.test` | `2699000035` | Lokal non-KIPK | Tiket dibatalkan |
| 36 | `penghuni-06@example.test` | `2699000036` | Lokal non-KIPK | Riwayat izin ditolak |
| 37 | `penghuni-07@example.test` | `2699000037` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 38 | `penghuni-08@example.test` | `2699000038` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 39 | `penghuni-09@example.test` | `2699000039` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 40 | `penghuni-10@example.test` | `2699000040` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 41 | `penghuni-11@example.test` | `2699000041` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 42 | `penghuni-12@example.test` | `2699000042` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 43 | `penghuni-13@example.test` | `2699000043` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 44 | `penghuni-14@example.test` | `2699000044` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 45 | `penghuni-15@example.test` | `2699000045` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 46 | `penghuni-16@example.test` | `2699000046` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 47 | `penghuni-17@example.test` | `2699000047` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 48 | `penghuni-18@example.test` | `2699000048` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 49 | `penghuni-19@example.test` | `2699000049` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 50 | `penghuni-20@example.test` | `2699000050` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 51 | `penghuni-21@example.test` | `2699000051` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 52 | `penghuni-22@example.test` | `2699000052` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 53 | `penghuni-23@example.test` | `2699000053` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 54 | `penghuni-24@example.test` | `2699000054` | Lokal non-KIPK | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |

## Akun awal yang tetap tersedia

Akun berikut berasal dari seeder dasar. Akun-akun ini tidak memiliki rangkaian skenario lengkap seperti akun `@example.test`. Status yang tercantum adalah kondisi saat dibuat; data lama yang sudah berubah tetap dipertahankan.

| No. | Email | NIM/NIP | Peran atau kondisi awal |
| --- | --- | --- | --- |
| 1 | `superadmin@unand.ac.id` | `SA001` | Superadmin |
| 2 | `pimpinan@unand.ac.id` | `P001` | Pimpinan |
| 3 | `admin@unand.ac.id` | `ADM001` | Staff administrasi |
| 4 | `admin.layanan@unand.ac.id` | `LAY001` | Admin layanan |
| 5 | `admin.aset@unand.ac.id` | `AST001` | Admin aset |
| 6 | `fasilitator@unand.ac.id` | `FAS001` | Fasilitator |
| 7 | `teknisi@unand.ac.id` | `TEK001` | Teknisi |
| 8 | `go@unand.ac.id` | `GO001` | GO / Cleaning Service |
| 9 | `orang.tua@unand.ac.id` | `ORT001` | Orang tua, terhubung ke mahasiswa.kipk@unand.ac.id |
| 10 | `mahasiswa.kipk@unand.ac.id` | `2611521001` | Client lokal KIPK; profil awal calon |
| 11 | `mahasiswa.nonkipk@unand.ac.id` | `2611521002` | Client lokal non-KIPK; profil awal calon |
| 12 | `mahasiswa.penghuni@unand.ac.id` | `2511521003` | Client penghuni lokal; profil awal calon |
| 13 | `international@unand.ac.id` | `2699001001` | Client internasional gratis; profil awal calon |
| 14 | `nonmahasiswa@unand.ac.id` | `NMS001` | Client nonmahasiswa; profil awal calon |

## Urutan uji coba yang disarankan

| Alur | Akun client | Akun petugas | Langkah |
| --- | --- | --- | --- |
| Pendaftaran | `daftar-draft@example.test` | `admin_layanan@example.test` | Ajukan pendaftaran, review, pilih penempatan yang tersedia, lalu selesaikan pembayaran |
| Verifikasi pembayaran | `bayar-verifikasi@example.test` | `admin_layanan@example.test` | Terima pendaftaran dan tentukan kamar dari preferensinya, lalu verifikasi pembayaran; periksa status hunian dan kwitansi |
| Subsidi KIPK | `kipk-penempatan@example.test` | `admin_layanan@example.test` | Terima dan tempatkan penghuni; periksa tagihan nol dan aktivasi hunian |
| Cicilan | `cicilan-pengajuan@example.test` / `cicilan-aktif@example.test` | `admin_layanan@example.test` | Tetapkan jadwal atau lanjutkan pembayaran termin yang belum lunas |
| Kerusakan | `binaan-aktif@example.test` / `penghuni-01@example.test` | `teknisi@example.test` | Laporkan aset tertentu, mulai pengerjaan, unggah foto sesudah dan catatan penyelesaian |
| Checkout | `checkout-pengajuan@example.test` | `go@example.test`, lalu `fasilitator@example.test` | GO memeriksa seluruh aset kamar; fasilitator menyelesaikan checkout |
| Surat modern | `checkout-selesai@example.test` | Otomatis berdasarkan data sistem | Ajukan surat setelah checkout selesai dan tagihan lunas |
| Surat alumni | `legacy-lunas@example.test` / `legacy-belum-lunas@example.test` | `admin_layanan@example.test` | Verifikasi bukti atau selesaikan tagihan sesuai klasifikasi |
| Izin manual | `izin-review@example.test` | `fasilitator@example.test` | Setujui/tolak, lalu uji bukti sampai dan bukti kembali dari akun penghuni |
| Absensi QR | `binaan-aktif@example.test` / `kipk-aktif@example.test` | `fasilitator@example.test` | Buka sesi kegiatan, pindai QR, periksa waktu, lokasi, dan riwayat kehadiran |
| Orang tua | `binaan-aktif@example.test` | `orang_tua@example.test` | Periksa data anak yang terhubung pada dashboard orang tua |

### Catatan pengujian absensi

1. Login sebagai `fasilitator@example.test` dan buka pengelolaan kegiatan.
2. Pilih **DEMO: Buka QR untuk pengujian langsung**.
3. Kegiatan tersebut dibuat untuk hari saat seed pertama dijalankan. **Jika pengujian dilakukan pada hari berikutnya, ubah jadwal kegiatan agar mencakup waktu pengujian**, atau buat kegiatan baru.
4. Buka QR menggunakan lokasi fasilitator sebenarnya.
5. Login sebagai `binaan-aktif@example.test` pada browser/perangkat lain, lalu buka menu **Absensi** untuk scan QR.
6. Fasilitator dan mahasiswa harus berada dalam radius sesi; waktu sesi dan akurasi lokasi harus valid.
7. Gunakan `penghuni-lama@example.test` untuk memeriksa bahwa penghuni yang masuk kembali tidak dianggap mahasiswa binaan.
8. Kegiatan umum **DEMO: Buka QR untuk pengujian langsung** dapat diikuti binaan dari seluruh gedung. Kegiatan **DEMO: Pembinaan khusus gedung P/W/T** hanya menerima penghuni aktif gedung terkait. `binaan-aktif@example.test` berada di DEMO-W; `kipk-aktif@example.test` berada di DEMO-P.
9. Fasilitator demo dapat mengelola gedung P/W dan membuka QR kegiatan umum, termasuk kegiatan umum yang dibuat pengelola lain. Kegiatan gedung T tidak tersedia bagi fasilitator demo.
10. Uji keluar radius oleh mahasiswa atau fasilitator, GPS tidak akurat, lokasi fasilitator lebih dari 60 detik tanpa pembaruan, QR kedaluwarsa, sesi ditutup lebih awal, dan scan ulang. Seluruh kondisi tersebut harus ditolak tanpa menambah kehadiran.

### Catatan data

- Foto dan PDF berlabel demo disediakan untuk pengujian unggah, tampil, dan unduh dokumen.
- Surat bebas asrama memakai template **CONTOH / DUMMY — BUKAN SURAT RESMI** sampai contoh resmi tersedia. Admin membuka tabel Verifikasi Bebas Asrama, memilih tab status, lalu ikon detail untuk memeriksa bukti, tagihan, atau mengunduh surat.
- Virtual account **DEMO-NONAKTIF** hanya data simulasi; tidak terhubung ke provider pembayaran.
- Tanggal jatuh tempo, keterlambatan izin, dan kelayakan tahun pertama mengikuti waktu. Kondisinya dapat berubah setelah waktu berlalu.
- Seeding ulang mempertahankan perkembangan skenario; bukan perintah reset pengujian.
- Laundry dan galon tidak memiliki skenario karena proses bisnisnya belum ditentukan.

## Menjalankan seeder dan pengujian

Tambahkan data yang belum tersedia pada lingkungan lokal:

```bash
php artisan db:seed
```

Jalankan pengujian seeder pada database testing:

```bash
php artisan test --compact --filter=ComprehensiveSeederTest
```

## Sumber definisi

- [Ringkasan dan pengelompokan 54 skenario data uji](SKENARIO_UJI_COBA.md)
- [Seeder dasar dan akun awal](database/seeders/DatabaseSeeder.php)
- [Akun skenario, kamar, aset, pendaftaran, dan tagihan](database/seeders/ResidenceScenarioSeeder.php)
- [Kerusakan, checkout, surat, izin, absensi, dan konten](database/seeders/ResidenceOperationsSeeder.php)
- [Pengujian konsistensi seeder dan kelanjutan alur](tests/Feature/ComprehensiveSeederTest.php)
