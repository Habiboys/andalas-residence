# Andalas Residen — Dokumen Perencanaan Sistem
### Rancangan UI & Database (Landing Page + Web App)

---

## 1. Ringkasan Proyek

**Andalas Residen** adalah sistem informasi pengelolaan asrama mahasiswa Universitas Andalas, mencakup:

- Landing page publik
- Web app internal dengan 5 role: **Pimpinan, Mahasiswa, Fasilitator, Staff Administrasi, Teknisi**

**Cakupan modul:**

| No | Modul |
|---|---|
| 1 | Pembayaran & Checkin |
| 2 | Auto Penempatan Kamar |
| 3 | Pengelolaan Gedung, Lantai, Kamar, Ruangan & Fasilitas |
| 4 | Monitoring Aset (pendaftaran & kondisi) |
| 5 | Pengajuan Bebas Asrama (surat) |
| 6 | Pengajuan Izin Pulang |
| 7 | Absensi Smart Surrau (sholat 5 waktu via barcode) |
| 8 | Pemetaan Kamar (denah okupansi) |
| 9 | Keuangan (pembayaran mahasiswa + transaksi operasional) |
| 10 | Jadwal Kegiatan |
| 11 | Penilaian Kinerja Teknisi |
| 12 | Dashboard Pimpinan |

---

## 2. Matriks Role × Modul

| Modul | Mahasiswa | Fasilitator | Staff Admin | Teknisi | Pimpinan |
|---|:---:|:---:|:---:|:---:|:---:|
| Checkin & Pembayaran | Isi & bayar | - | Verifikasi | - | Lihat rekap |
| Auto Penempatan Kamar | Lihat hasil | - | Kelola/override | - | Lihat rekap |
| Gedung/Kamar/Fasilitas | Lihat kamar sendiri | Lihat wilayahnya | Kelola penuh (CRUD) | Lihat terkait tiket | Lihat rekap |
| Monitoring Aset | Lapor kerusakan | Lihat wilayahnya | Kelola penuh (CRUD) | Tangani tiket | Lihat rekap |
| Bebas Asrama | Ajukan | - | Approve/tolak, cetak surat | - | Lihat rekap |
| Izin Pulang | Ajukan | Lihat (opsional) | Approve/tolak | - | Lihat rekap |
| Absensi Sholat | Punya barcode, lihat riwayat | Scan barcode | Lihat rekap | - | Lihat rekap |
| Pemetaan Kamar | Lihat kamar sendiri | Lihat wilayahnya | Kelola penuh | - | Lihat rekap |
| Keuangan | Lihat tagihan sendiri | - | Kelola penuh | - | Lihat laporan |
| Jadwal Kegiatan | Lihat & konfirmasi hadir | Lihat & bantu koordinasi | Buat/kelola | - | Lihat rekap |
| Penilaian Teknisi | - | - | Beri penilaian | Lihat hasil penilaian | Lihat rekap |
| Dashboard | - | - | - | - | Full akses |

---

## 3. Rancangan Database

Skema berikut disusun per domain. Nama tabel pakai `snake_case`, PK `id`, FK `<nama>_id`. Sesuaikan tipe data ke DBMS pilihan (PostgreSQL/MySQL).

### 3.1 Domain: Pengguna & Role

**`users`**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID/PK | |
| nim_nip | varchar | NIM (mahasiswa) atau NIP/ID pegawai |
| nama | varchar | |
| email | varchar | |
| no_hp | varchar | |
| password_hash | varchar | |
| role | enum | pimpinan, mahasiswa, fasilitator, staff_admin, teknisi |
| status | enum | aktif, nonaktif |
| foto_profil | varchar | url |
| created_at / updated_at | timestamp | |

**`mahasiswa_profil`** (ekstensi `users` untuk role mahasiswa)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID/PK | |
| user_id | FK → users | |
| program_studi | varchar | |
| angkatan | varchar | |
| barcode_code | varchar unique | kode unik untuk absensi & identifikasi |
| tanggal_masuk | date | |
| status_huni | enum | calon, aktif, bebas_asrama, keluar |

### 3.2 Domain: Gedung, Kamar & Fasilitas

**`gedung`**
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| nama_gedung | varchar |
| alamat | varchar |
| jumlah_lantai | int |

**`lantai`**
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| gedung_id | FK → gedung |
| nomor_lantai | int |

**`kamar`**
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| lantai_id | FK → lantai |
| nomor_kamar | varchar |
| kapasitas | int |
| status | enum (kosong, terisi, penuh, maintenance) |
| tipe_kamar | varchar | opsional (reguler/VIP dll) |

**`penempatan_kamar`** (histori auto-penempatan & manual override)
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| mahasiswa_id | FK → mahasiswa_profil |
| kamar_id | FK → kamar |
| tanggal_mulai | date |
| tanggal_selesai | date, nullable |
| metode | enum (auto, manual) |
| status | enum (aktif, berakhir) |
| diproses_oleh | FK → users, nullable | staff admin bila override |

**`fasilitas`** (fasilitas umum: dapur, ruang tamu, mushola, dll — tidak spesifik per kamar)
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| gedung_id | FK → gedung, nullable |
| lantai_id | FK → lantai, nullable |
| nama_fasilitas | varchar |
| kategori | varchar |
| kondisi | enum (baik, rusak_ringan, rusak_berat) |

### 3.3 Domain: Aset & Maintenance

**`aset`**
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| kamar_id | FK → kamar, nullable |
| fasilitas_id | FK → fasilitas, nullable |
| nama_aset | varchar |
| kategori | varchar | elektronik, furnitur, dll |
| kondisi | enum (baik, rusak_ringan, rusak_berat, hilang) |
| tanggal_pengadaan | date |
| nilai_aset | decimal |
| kode_inventaris | varchar unique |

**`laporan_kerusakan`** (tiket)
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| aset_id | FK → aset |
| dilaporkan_oleh | FK → users |
| deskripsi | text |
| status | enum (baru, diproses, selesai, dibatalkan) |
| teknisi_id | FK → users, nullable |
| tanggal_lapor | timestamp |
| tanggal_selesai | timestamp, nullable |
| catatan_penyelesaian | text |

**`penilaian_teknisi`**
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| teknisi_id | FK → users |
| laporan_kerusakan_id | FK → laporan_kerusakan |
| dinilai_oleh | FK → users | staff admin |
| skor | int (1-5) |
| catatan | text |
| tanggal_penilaian | date |

### 3.4 Domain: Checkin & Pembayaran

**`checkin`**
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| mahasiswa_id | FK → mahasiswa_profil |
| tanggal_checkin | date |
| status | enum (menunggu_pembayaran, terverifikasi, selesai) |

**`pembayaran`**
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| mahasiswa_id | FK → mahasiswa_profil |
| checkin_id | FK → checkin, nullable |
| jenis_pembayaran | enum (checkin, denda, bulanan, lainnya) |
| jumlah | decimal |
| metode_pembayaran | varchar |
| status | enum (pending, berhasil, gagal, refund) |
| bukti_pembayaran | varchar, nullable | url |
| tanggal_bayar | timestamp |
| diverifikasi_oleh | FK → users, nullable |

### 3.5 Domain: Keuangan Operasional

**`kategori_transaksi`**
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| nama | varchar |
| tipe | enum (pemasukan, pengeluaran) |

**`transaksi_keuangan`** (buku besar operasional gedung — di luar pembayaran mahasiswa)
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| kategori_id | FK → kategori_transaksi |
| tipe | enum (pemasukan, pengeluaran) |
| jumlah | decimal |
| deskripsi | text |
| tanggal | date |
| referensi_pembayaran_id | FK → pembayaran, nullable | jika terhubung ke pembayaran mahasiswa |
| dicatat_oleh | FK → users |
| lampiran | varchar, nullable |

### 3.6 Domain: Pengajuan Surat

**`pengajuan_bebas_asrama`**
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| mahasiswa_id | FK → mahasiswa_profil |
| alasan | text |
| status | enum (diajukan, diproses, disetujui, ditolak) |
| nomor_surat | varchar, nullable |
| tanggal_pengajuan | timestamp |
| tanggal_disetujui | timestamp, nullable |
| disetujui_oleh | FK → users, nullable |
| file_surat | varchar, nullable | url PDF surat yang diterbitkan |

**`pengajuan_izin_pulang`**
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| mahasiswa_id | FK → mahasiswa_profil |
| tanggal_mulai | date |
| tanggal_kembali | date |
| alasan | text |
| status | enum (diajukan, disetujui, ditolak) |
| disetujui_oleh | FK → users, nullable |
| tanggal_pengajuan | timestamp |

### 3.7 Domain: Absensi Smart Surrau

**`absensi_sholat`**
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| mahasiswa_id | FK → mahasiswa_profil |
| waktu_sholat | enum (subuh, dzuhur, ashar, maghrib, isya) |
| tanggal | date |
| waktu_scan | timestamp |
| discan_oleh | FK → users | fasilitator |
| metode | enum (barcode) |

### 3.8 Domain: Jadwal Kegiatan

**`kegiatan`**
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| judul | varchar |
| deskripsi | text |
| lokasi | varchar |
| tanggal_mulai | timestamp |
| tanggal_selesai | timestamp |
| target_role | varchar/array | siapa saja yang dituju |
| dibuat_oleh | FK → users |

**`kegiatan_partisipan`** (opsional, jika perlu konfirmasi kehadiran)
| Kolom | Tipe |
|---|---|
| id | UUID/PK |
| kegiatan_id | FK → kegiatan |
| user_id | FK → users |
| status_konfirmasi | enum (belum, hadir, tidak_hadir) |

### 3.9 Relasi Utama (ringkasan ERD tekstual)

```
users 1---1 mahasiswa_profil
gedung 1---N lantai 1---N kamar
kamar 1---N penempatan_kamar N---1 mahasiswa_profil
kamar 1---N aset
fasilitas 1---N aset
aset 1---N laporan_kerusakan N---1 users(teknisi)
laporan_kerusakan 1---1 penilaian_teknisi
mahasiswa_profil 1---N checkin 1---N pembayaran
pembayaran 1---N transaksi_keuangan (opsional referensi)
mahasiswa_profil 1---N pengajuan_bebas_asrama
mahasiswa_profil 1---N pengajuan_izin_pulang
mahasiswa_profil 1---N absensi_sholat N---1 users(fasilitator)
kegiatan 1---N kegiatan_partisipan N---1 users
```

---

## 4. Rancangan UI (untuk Figma Make)

### 4.1 Prinsip Desain (tetapkan sebelum mulai generate)

- **Warna**: 1 primary color + netral abu-abu 5-6 tingkat + 1 accent opsional. Hindari gradient/warna psikadelik.
- **Tipografi**: 1 font family (mis. Inter/Geist), 4 skala ukuran (heading, subheading, body, caption).
- **Spacing**: kelipatan 4px/8px konsisten.
- **Komponen**: flat, border tipis, radius kecil-konsisten (±8px), shadow minim. Hindari glassmorphism/neumorphism/ilustrasi 3D generik.
- **Ikon**: satu set saja (Lucide/Phosphor).
- **Data-heavy screens**: prioritas tabel & angka yang jelas, bukan kartu statistik berlebihan.
- **Landing page** boleh sedikit lebih visual (foto gedung asli, testimoni), tapi tetap 1 sistem warna & tipografi dengan web app.

### 4.2 Daftar Halaman per Role

**Publik**
1. Landing page (hero, tentang Andalas Residen, fasilitas unggulan, alur pendaftaran, kontak/FAQ)
2. Login / Register

**Mahasiswa**
3. Dashboard mahasiswa (ringkasan: kamar, tagihan, status pengajuan, jadwal terdekat)
4. Checkin & Pembayaran
5. Detail kamar & fasilitas
6. Kartu barcode pribadi + riwayat absensi sholat
7. Form pengajuan bebas asrama + status
8. Form pengajuan izin pulang + status
9. Lapor kerusakan aset
10. Tagihan/riwayat pembayaran
11. Jadwal kegiatan

**Fasilitator**
12. Mode scan barcode (absensi sholat) — layar simpel, minim distraksi
13. Rekap kehadiran per lantai/kamar
14. Monitoring kondisi kamar di wilayahnya

**Staff Administrasi**
15. Verifikasi pembayaran
16. Kelola auto-penempatan kamar (+ override manual)
17. Kelola gedung/lantai/kamar/fasilitas (CRUD)
18. Kelola aset & pendaftaran aset
19. Antrian & approval pengajuan (bebas asrama, izin pulang) + cetak surat
20. Pemetaan kamar (denah okupansi)
21. Keuangan: pembayaran mahasiswa & transaksi operasional (buku besar)
22. Kelola jadwal kegiatan
23. Beri penilaian kinerja teknisi

**Teknisi**
24. Daftar tiket kerusakan masuk
25. Update status pengerjaan tiket
26. Riwayat pekerjaan & hasil penilaian

**Pimpinan**
27. Dashboard eksekutif (okupansi, tren pembayaran/keuangan, kondisi aset, kehadiran sholat, kinerja teknisi, jumlah pengajuan)
28. Laporan keuangan
29. Laporan aset & fasilitas

### 4.3 Urutan Pengerjaan (disarankan)

1. Landing page + Auth — sekaligus jadi acuan nada visual
2. Checkin & Pembayaran (mahasiswa) — modul paling kritikal
3. Dashboard Mahasiswa
4. Pengelolaan Gedung/Kamar/Fasilitas + Pemetaan Kamar (staff admin) — fondasi data untuk modul lain
5. Monitoring Aset (staff admin, mahasiswa lapor, teknisi tangani)
6. Pengajuan Surat (bebas asrama & izin pulang) — mahasiswa & staff admin
7. Absensi Smart Surrau — fasilitator (scan) & rekap
8. Keuangan — staff admin
9. Jadwal Kegiatan
10. Panel Teknisi + Penilaian Kinerja
11. Dashboard Pimpinan — terakhir karena menarik data semua modul

### 4.4 Tips Prompting Figma Make

- Sertakan design system (poin 4.1) di prompt awal setiap sesi.
- Generate per halaman sesuai urutan di atas, jangan gabungkan banyak fitur dalam satu prompt.
- Minta layout grid/tabel untuk data, bukan kartu ikon besar untuk tiap angka.
- Setelah generate, edit manual bagian yang terasa "template AI" (ilustrasi generik, copy marketing-speak berlebihan).
- Jadikan komponen (tabel, form, card) yang sudah oke sebagai reusable component, pakai ulang di halaman lain agar konsisten.

---

## 5. Catatan Lanjutan

- Skema database di atas adalah rancangan logis awal — perlu disesuaikan (indexing, normalisasi lebih lanjut, constraint) saat masuk tahap implementasi.
- Beberapa tabel (mis. `kegiatan_partisipan`, `kategori_transaksi`) bersifat opsional tergantung kebutuhan detail pelaporan.
- Modul keuangan sengaja dipisah antara `pembayaran` (transaksi dari mahasiswa) dan `transaksi_keuangan` (buku besar operasional) agar laporan keuangan pimpinan bisa merangkum keduanya tanpa mencampur konteks.