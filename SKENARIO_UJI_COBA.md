# Ringkasan 54 skenario data uji Andalas Residence

Untuk urutan tindakan, perpindahan akun dan hasil yang harus diperiksa, ikuti [Panduan uji proses bisnis dari awal](PANDUAN_UJI_PROBIS.md).

## Arti angka 54

Seeder menyediakan **54 akun client dengan kondisi awal pengujian**. Angka ini bukan jumlah 54 proses bisnis berbeda atau 54 pengujian E2E otomatis:

| Kelompok                                                           | Jumlah |
| ------------------------------------------------------------------ | -----: |
| Pendaftaran dan pembayaran                                         |      8 |
| Kategori penghuni dan kelayakan binaan                             |      7 |
| Checkout dan surat modern                                          |      5 |
| Surat bebas asrama angkatan lama                                   |      5 |
| Perizinan                                                          |      5 |
| Variasi operasional pada penghuni-01 sampai penghuni-06            |      6 |
| Penghuni tambahan untuk pencarian, filter, pagination, dan layanan |     18 |
| **Total akun/skenario data**                                       | **54** |

Dengan demikian, ada **30 skenario utama**, **6 variasi operasional tambahan**, dan **18 akun tambahan** yang memakai kondisi dasar penghuni aktif.

Password awal semua akun adalah **`password`**. Akun petugas dan daftar kredensial lengkap tersedia di [AKUN_UJI_COBA.md](AKUN_UJI_COBA.md).

## Pendaftaran dan pembayaran

| No. | Akun                               | Kondisi awal / tujuan pengujian                                        |
| --- | ---------------------------------- | ---------------------------------------------------------------------- |
| 1   | `daftar-draft@example.test`        | Draft pendaftaran; lanjutkan pengajuan                                 |
| 2   | `daftar-review@example.test`       | Pendaftaran submitted; review oleh admin layanan                       |
| 3   | `daftar-ditolak@example.test`      | Pendaftaran ditolak; tagihan dibatalkan; perbaiki dan ajukan ulang     |
| 4   | `tagihan-belum-bayar@example.test` | Tagihan belum dibayar dan sudah melewati jatuh tempo saat seed         |
| 5   | `bayar-verifikasi@example.test`    | Bukti pembayaran menunggu verifikasi admin; pendaftaran masih verified |
| 6   | `bayar-ditolak@example.test`       | Pembayaran ditolak; baca alasan dan unggah pembayaran yang sesuai      |
| 7   | `cicilan-pengajuan@example.test`   | Tagihan terbit menunggu penetapan nominal berikutnya oleh admin        |
| 8   | `cicilan-aktif@example.test`       | Penghuni aktif; termin pertama lunas, termin kedua belum dibayar       |

## Kategori penghuni dan kelayakan binaan

| No. | Akun                                | Kondisi awal / tujuan pengujian                                                           |
| --- | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| 9   | `binaan-aktif@example.test`         | Penghuni tahun pertama; memenuhi kelayakan absensi saat seed; terhubung ke orang tua demo |
| 10  | `kipk-penempatan@example.test`      | Tagihan nol dengan subsidi KIPK; menunggu penerimaan dan penempatan admin                 |
| 11  | `kipk-aktif@example.test`           | Penghuni aktif, tagihan nol; memenuhi kelayakan absensi saat seed                         |
| 12  | `internasional-gratis@example.test` | Penghuni aktif; tagihan nol karena subsidi; bukan mahasiswa binaan                        |
| 13  | `internasional-bayar@example.test`  | Penghuni aktif dengan pembayaran lunas; bukan mahasiswa binaan                            |
| 14  | `nonmahasiswa-aktif@example.test`   | Penghuni aktif tanpa program studi; bukan mahasiswa binaan                                |
| 15  | `penghuni-lama@example.test`        | Angkatan 2025, pernah checkout dan masuk kembali; tidak berhak absensi binaan             |

## Checkout dan surat modern

| No. | Akun                              | Kondisi awal / tujuan pengujian                                           |
| --- | --------------------------------- | ------------------------------------------------------------------------- |
| 16  | `checkout-pengajuan@example.test` | Pengajuan checkout menunggu pemeriksaan GO                                |
| 17  | `checkout-siap@example.test`      | Inspeksi selesai; siap diselesaikan fasilitator                           |
| 18  | `checkout-rusak@example.test`     | Inspeksi selesai dengan temuan kerusakan dan tiket terkait; siap checkout |
| 19  | `checkout-selesai@example.test`   | Sudah checkout; akun masih aktif untuk mengajukan surat bebas asrama      |
| 20  | `surat-modern@example.test`       | Checkout selesai dan surat modern sudah terbit; akun NONAKTIF             |

## Surat bebas asrama untuk angkatan lama

| No. | Akun                               | Kondisi awal / tujuan pengujian                                                           |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| 21  | `legacy-lunas@example.test`        | Pengajuan alumni lunas dengan bukti pembayaran dan rekening koran; menunggu persetujuan   |
| 22  | `legacy-belum-lunas@example.test`  | Klasifikasi alumni belum lunas sudah diverifikasi; invoice tersedia untuk dibayar         |
| 23  | `legacy-bukan-alumni@example.test` | Mengajukan surat tanpa riwayat hunian; admin perlu memverifikasi klasifikasi bukan alumni |
| 24  | `legacy-ditolak@example.test`      | Pengajuan surat ditolak karena bukti belum sesuai; uji perbaikan dokumen                  |
| 25  | `legacy-surat-terbit@example.test` | Sudah diverifikasi sebagai bukan alumni dan surat terbit; akun NONAKTIF                   |

## Perizinan

| No. | Akun                          | Kondisi awal / tujuan pengujian                                                      |
| --- | ----------------------------- | ------------------------------------------------------------------------------------ |
| 26  | `izin-otomatis@example.test`  | Enam izin sebelumnya selesai; izin ketujuh otomatis sedang_izin; unggah bukti sampai |
| 27  | `izin-review@example.test`    | Tujuh izin sebelumnya selesai; izin kedelapan menunggu keputusan fasilitator         |
| 28  | `izin-sampai@example.test`    | Sudah mengunggah bukti sampai di tujuan; lanjutkan bukti kembali                     |
| 29  | `izin-terlambat@example.test` | Sudah sampai di tujuan tetapi melewati rencana kembali; uji monitoring keterlambatan |
| 30  | `izin-kembali@example.test`   | Izin sudah selesai kembali, lengkap dengan foto dan lokasi                           |

## Variasi tiket kerusakan dan izin ditolak

| No. | Akun                       | Kondisi awal / tujuan pengujian                                   |
| --- | -------------------------- | ----------------------------------------------------------------- |
| 31  | `penghuni-01@example.test` | Tiket menunggu triage                                             |
| 32  | `penghuni-02@example.test` | Tiket sudah didisposisikan ke teknisi                             |
| 33  | `penghuni-03@example.test` | Tiket sedang dikerjakan                                           |
| 34  | `penghuni-04@example.test` | Tiket selesai, foto sesudah tersedia, dan penilaian teknisi final |
| 35  | `penghuni-05@example.test` | Tiket dibatalkan                                                  |
| 36  | `penghuni-06@example.test` | Riwayat izin ditolak                                              |

## Data tambahan untuk pengujian tabel

| No. | Akun                       | Kondisi awal / tujuan pengujian                                                      |
| --- | -------------------------- | ------------------------------------------------------------------------------------ |
| 37  | `penghuni-07@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 38  | `penghuni-08@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 39  | `penghuni-09@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 40  | `penghuni-10@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 41  | `penghuni-11@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 42  | `penghuni-12@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 43  | `penghuni-13@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 44  | `penghuni-14@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 45  | `penghuni-15@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 46  | `penghuni-16@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 47  | `penghuni-17@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 48  | `penghuni-18@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 49  | `penghuni-19@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 50  | `penghuni-20@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 51  | `penghuni-21@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 52  | `penghuni-22@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 53  | `penghuni-23@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |
| 54  | `penghuni-24@example.test` | Penghuni aktif untuk uji daftar, pencarian, filter, pagination, dan layanan penghuni |

## Cara menjalankan pengujian lintas peran

| Alur                        | Urutan peran                                        | Hasil yang diperiksa                                                                                       |
| --------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Pendaftaran berbayar        | Client → Admin Layanan → Client → Admin Layanan     | Reservasi 24 jam, invoice otomatis, pembayaran tanpa approval pendaftaran, aktivasi otomatis, dan kwitansi |
| KIPK / internasional gratis | Client → Admin Layanan                              | Tagihan pribadi nol dengan piutang sponsor tercatat, pengesahan dan penempatan admin, aktivasi hunian      |
| Cicilan                     | Admin Layanan → Client → Admin Layanan              | Nominal berikutnya + VA di halaman Invoice, pembayaran sesuai nominal, aktivasi otomatis, dan sisa utang   |
| Kerusakan                   | Penghuni → Teknisi → Pimpinan                       | Aset/lokasi spesifik, foto awal, proses pengerjaan, foto akhir, dan laporan                                |
| Checkout                    | Penghuni → GO → Fasilitator                         | Pemeriksaan seluruh aset, temuan kerusakan, akhir penempatan, dan kapasitas kamar                          |
| Surat bebas asrama modern   | Penghuni setelah checkout → Sistem                  | Tidak ada kewajiban tersisa, surat dapat diunduh, dan akun nonaktif                                        |
| Surat bebas asrama legacy   | Client → Admin Layanan → Client jika perlu membayar | Klasifikasi alumni, bukti pembayaran atau tagihan, surat, dan akun nonaktif                                |
| Perizinan                   | Penghuni → Fasilitator bila perlu → Penghuni        | Keputusan izin, foto/lokasi sampai, keterlambatan, dan foto/lokasi kembali                                 |
| Absensi QR                  | Fasilitator → Mahasiswa binaan                      | Kelayakan penghuni, waktu sesi, radius lokasi kedua pihak, dan riwayat absensi                             |
| Pemantauan orang tua        | Orang Tua                                           | Data anak yang terhubung, bukan seluruh penghuni                                                           |

## Hal yang perlu diperhatikan

- Kondisi di atas adalah kondisi **saat seed pertama dijalankan**. Perubahan selama pengujian dipertahankan ketika seeder dijalankan ulang.
- `fasilitator@example.test` bertugas di **DEMO-W**, sedangkan `fasilitator@unand.ac.id` di **DEMO-P**. **DEMO-T** untuk menguji penolakan lintas gedung.
- QR baru dibuat melalui **Kegiatan & Absensi → Buat kegiatan & QR**, sekaligus dengan kegiatan. Seeder menyediakan riwayat; pengujian GPS langsung memerlukan kegiatan baru di lokasi sebenarnya.
- Pasangkan `binaan-aktif@example.test` (W) dengan fasilitator W; `kipk-aktif@example.test` (P) dengan fasilitator P. Tidak ada kegiatan umum lintas gedung.
- Uji master Sholat Subuh/Lainnya, nama bebas pada Lainnya, mulai otomatis, durasi, GPS/peta, peserta per lantai, status hadir/belum, koreksi manual beralasan, dan audit.
- Dashboard fasilitator menunjukkan gedung penugasan dan statistik hanya gedung tersebut. Admin dapat menugaskan beberapa fasilitator ke satu gedung; setiap fasilitator tetap hanya satu gedung.
- Pembatasan absensi tetap **angkatan 2026 ke atas**, lokal, tahun pertama hunian, dan belum checkout/masuk kembali. Angkatan berasal dari profil; dua digit awal NIM seeder dibuat konsisten dengannya.
- Pada tabel Verifikasi Bebas Asrama, uji tab Semua, Menunggu verifikasi, Diverifikasi, Disetujui, dan Ditolak; buka detail untuk meninjau bukti atau mengunduh PDF sesuai kategori. Diverifikasi belum berarti surat terbit.
- Batas izin mengikuti implementasi/acuan: paling banyak enam pengajuan sebelumnya masih otomatis; lebih dari enam pengajuan sebelumnya memerlukan verifikasi.
- Surat yang sudah terbit membuat akun `surat-modern@example.test` dan `legacy-surat-terbit@example.test` nonaktif.
- VA demo bukan integrasi bank. Pengujian pembayaran menggunakan alur pencatatan dan verifikasi yang tersedia.
- Laundry dan galon belum disediakan karena proses bisnisnya belum ditentukan.
- Seeder membantu pengujian manual. Pengujian otomatis konsistensi data dan beberapa kelanjutan alur ada di [ComprehensiveSeederTest.php](tests/Feature/ComprehensiveSeederTest.php); daftar ini bukan klaim bahwa seluruh interaksi browser sudah diuji.

## Sumber

- [Definisi 54 akun client](database/seeders/ResidenceScenarioSeeder.php)
- [Relasi dan kondisi operasional](database/seeders/ResidenceOperationsSeeder.php)
