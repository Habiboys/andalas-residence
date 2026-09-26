# Panduan uji proses bisnis Andalas Residence dari awal

Panduan pengujian manual, disusun 24 September 2026 berdasarkan implementasi dan seeder proyek. Kondisi akun di sini adalah kondisi awal seeder; tindakan yang sudah dilakukan penguji dapat mengubahnya.

## 1. Mulai dari mana?

Ada dua cara pengujian:

| Cara                | Akun yang dipakai                                                               | Cocok untuk                                             |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Dari pembuatan akun | Buat akun baru lewat halaman Daftar, memakai email dan NIM yang belum digunakan | Menguji seluruh perjalanan pendaftaran sampai surat     |
| Dari tahap tertentu | Akun `@example.test` di panduan ini                                             | Menguji satu proses tanpa mengulang seluruh pendaftaran |

**Password awal semua akun seeder: `password`.** Password akun yang dibuat sendiri mengikuti isian Anda. Login menggunakan email. Daftar lengkap tersedia di [AKUN_UJI_COBA.md](AKUN_UJI_COBA.md), sedangkan pembagian 54 akun tersedia di [SKENARIO_UJI_COBA.md](SKENARIO_UJI_COBA.md).

Untuk percobaan pertama, gunakan **`daftar-draft@example.test`** sebagai client dan **`admin_layanan@example.test`** sebagai petugas. Ikuti bagian 4 sampai aktif, lalu uji kerusakan, izin, dan absensi sebelum checkout. Surat bebas asrama dikerjakan terakhir karena membuat akun nonaktif.

## 2. Persiapan lingkungan dan data

### Menjalankan aplikasi

Jalankan perintah dari direktori proyek. Pilih salah satu cara berikut.

**Docker**, mengikuti port proyek 8003:

```powershell
docker compose up -d --build --wait
docker compose exec andalas-app php artisan migrate --no-interaction
docker compose exec andalas-app php artisan db:seed --no-interaction
```

Docker proyek menggunakan MySQL di host; MySQL tetap harus menyala. Compose mengatur `DB_HOST=host.docker.internal` di container meskipun `.env` lokal menggunakan `127.0.0.1`. Worker antrean sudah dijalankan oleh konfigurasi container.

Untuk pembaruan referensi pendaftaran pada database yang sudah ada, tanpa menambahkan akun demo:

```powershell
docker compose exec andalas-app php artisan migrate --no-interaction
docker compose exec andalas-app php artisan db:seed --class=UnandAcademicSeeder --no-interaction
docker compose exec andalas-app php artisan db:seed --class=ResidenceBuildingSeeder --no-interaction
```

Katalog lampiran berisi **16 fakultas, 67 departemen dan 153 prodi**. Angka 76 departemen pada ringkasan lampiran tidak sesuai jumlah rincian; seeder mengikuti rincian. Kode departemen/prodi adalah kode internal katalog. Seeder akademik mempertahankan relasi profil ketika memindahkan contoh Informatika lama ke Fakultas Teknologi Informasi. Seeder gedung menambahkan nama gedung yang belum ada; lantai, nomor kamar, kapasitas dan tarif tetap dikelola admin.

Docker hanya menjalankan aplikasi, dengan `storage` di bind volume dan `bootstrap/cache` di named volume. Untuk MySQL pada alamat khusus, isi `DOCKER_DB_HOST` sesuai alamatnya. `APP_URL` harus memuat alamat publik lengkap, termasuk port, contohnya `http://10.250.30.14:8003`. URL tautan dan aset dihasilkan dari nilai tersebut oleh `AppServiceProvider`. Jika memakai HTTPS di reverse proxy, set `APP_URL=https://domain-aplikasi` dan `TRUSTED_PROXIES` dengan IP/CIDR proxy yang benar.

Sesudah kode terbaru disalin ke server, jalankan `docker compose up -d --build --force-recreate`, kemudian migrasi/seeder referensi di atas. Entrypoint membangun ulang cache konfigurasi saat container dimulai. Cek log dengan `docker compose logs -f --tail=100 andalas-app`; jika URL CSS masih kehilangan port, periksa `docker compose exec andalas-app php artisan config:show app` dan pastikan nilai `url` memiliki `:8003`, lalu refresh browser.

**Tanpa Docker**, dengan PHP dan MySQL lokal:

```powershell
php artisan migrate --no-interaction
php artisan db:seed --no-interaction
npm run build
php artisan serve --port=8003
```

Buka terminal kedua untuk memproses PDF dan notifikasi:

```powershell
php artisan queue:work
```

Jangan menjalankan server lokal dan Docker bersamaan pada port 8003. Gunakan alamat aplikasi sesuai `APP_URL` di `.env`, lalu pilih Login atau Daftar.

### Mengulang dari kondisi awal

`db:seed` **bukan reset**: data demo yang belum ada ditambahkan, sedangkan perkembangan pengujian dipertahankan. Cara paling aman mengulang pendaftaran adalah membuat akun client baru; petugas demo tetap dapat digunakan.

Jika benar-benar membutuhkan semua akun kembali ke kondisi awal, gunakan **database khusus uji yang datanya boleh dibuang**. Perintah berikut menghapus seluruh tabel pada database yang sedang dikonfigurasi, lalu membuat dan mengisinya ulang. Jangan jalankan pada database yang berisi data penting. Panduan ini tidak menjalankannya otomatis.

```powershell
# Pilih salah satu, setelah memastikan database tujuan khusus uji.
php artisan migrate:fresh --seed --no-interaction

# Alternatif untuk aplikasi Docker:
docker compose exec andalas-app php artisan migrate:fresh --seed --no-interaction
```

### Persiapan penguji

1. Gunakan profil browser berbeda untuk client dan petugas. Tab biasa dalam satu profil berbagi sesi login; gunakan profil terpisah atau browser lain untuk dua akun sekaligus.
2. Siapkan foto JPG/PNG dan PDF dummy untuk bukti pembayaran, rekening koran, kerusakan, serta perizinan. Jangan memakai dokumen pribadi asli.
3. Catat email client, nomor invoice, tiket, izin, dan kamar agar mudah dicari oleh petugas berikutnya.
4. Buat kegiatan baru saat menguji QR; waktu mulai otomatis saat penyimpanan. Sesuaikan tanggal izin dan jatuh tempo dengan waktu pengujian. Data demo tidak otomatis kembali menjadi data hari ini saat seeding ulang.
5. Untuk QR dan bukti izin, izinkan lokasi. Untuk scan QR, izinkan kamera. Pengujian dari ponsel memerlukan alamat yang dapat dijangkau ponsel dan konteks browser yang mendukung kamera/lokasi; `localhost` di ponsel menunjuk ponsel itu sendiri. Gunakan HTTPS untuk akses lintas perangkat.

## 3. Akun petugas dan urutan pengujian

| Peran              | Email                        | Digunakan untuk                                                                             |
| ------------------ | ---------------------------- | ------------------------------------------------------------------------------------------- |
| Admin layanan      | `admin_layanan@example.test` | Pengaturan layanan, penempatan KIPK/sponsor, verifikasi pembayaran, invoice gabungan, surat |
| Admin aset         | `admin_aset@example.test`    | Gedung/kamar, stok dan aset                                                                 |
| Fasilitator W      | `fasilitator@example.test`   | Aset, kegiatan/QR, izin dan checkout DEMO-W                                                 |
| Fasilitator P      | `fasilitator@unand.ac.id`    | Aset, kegiatan/QR, izin dan checkout DEMO-P                                                 |
| GO                 | `go@example.test`            | Inspeksi kamar dan aset sebelum checkout                                                    |
| Teknisi            | `teknisi@example.test`       | Pengerjaan dan penyelesaian kerusakan                                                       |
| Pimpinan           | `pimpinan@example.test`      | Pemantauan laporan, kerusakan, aset, keuangan                                               |
| Orang tua          | `orang_tua@example.test`     | Pemantauan anak `binaan-aktif@example.test`                                                 |
| Staff administrasi | `staff_admin@example.test`   | Data master, keuangan, konten landing                                                       |
| Superadmin         | `superadmin@example.test`    | Akun/peran, audit, pemeriksaan lintas modul                                                 |

Fasilitator **`fasilitator@example.test` ditugaskan ke DEMO-W**, sedangkan **`fasilitator@unand.ac.id` ke DEMO-P**. Pilih petugas sesuai gedung penghuni untuk aset, izin, absensi, dan checkout. DEMO-T digunakan untuk pengujian pembatasan akses.

Urutan perjalanan lengkap:

1. Periksa gedung, kamar, periode dan aset.
2. Client memilih kamar dan mengirim pendaftaran → reservasi dan invoice terbentuk otomatis → pembayaran pribadi (atau pengesahan sponsor/KIPK oleh admin) → penghuni aktif.
3. Selama masih aktif: uji kerusakan, izin, kegiatan/absensi, dan pemantauan.
4. Client mengajukan checkout → GO memeriksa → fasilitator menyelesaikan.
5. Lunasi kewajiban → client mengajukan surat bebas asrama → PDF terbit → akun nonaktif.

## 4. Pendaftaran berbayar sampai menjadi penghuni

**Akun:** client baru atau `daftar-draft@example.test`; petugas `admin_layanan@example.test`.

| Langkah | Akun dan tindakan                                                                                                                                                       | Hasil yang diperiksa                                                                                                                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | Jika menguji dari nol, buka Daftar tanpa login; isi identitas, email, password, jenis pendaftar mahasiswa lokal, NIM, fakultas/departemen/prodi, dan data wajib lainnya | Akun dibuat sebagai calon penghuni; KIP-K ditentukan sistem dari daftar admin, bukan pilihan pendaftar                                                                            |
| 2       | Login client, buka Pendaftaran Asrama                                                                                                                                   | Pilihan gedung, tipe dan nomor kamar tersedia bagi non-KIPK; periode mengikuti satu periode aktif yang ditetapkan admin                                                           |
| 3       | Pilih gedung DEMO-P/W sesuai jenis kelamin, tipe dan nomor kamar serta periode aktif; periksa modal konfirmasi lalu kirim                                               | Reservasi kamar berlaku 24 jam (sesuai jam reservasi periode) dan invoice terbentuk otomatis; status menunggu pembayaran, tanpa persetujuan admin tambahan untuk pembayar pribadi |
| 4       | Login admin layanan → Invoice → cari tagihan client                                                                                                                     | Identitas, gedung/tipe/nomor kamar, durasi dan tarif sesuai pilihan; total, dibayar, sisa dan nominal sekarang tampil terpisah                                                    |
| 5       | (Opsional cicilan) Tetapkan nominal pembayaran berikutnya beserta VA pada tagihan tersebut                                                                              | Client hanya dapat mengunggah bukti sebesar nominal yang ditetapkan                                                                                                               |
| 6       | Login client → Tagihan → buka invoice; unggah bukti pembayaran sejumlah tagihan (atau nominal berikutnya bila ditetapkan)                                               | Bukti masuk sebagai pembayaran menunggu verifikasi, bukan langsung lunas                                                                                                          |
| 7       | Login admin → Verifikasi Pembayaran → tab menunggu → detail pembayaran → setujui                                                                                        | Invoice lunas/cicilan pertama terpenuhi; pendaftaran selesai otomatis: penempatan tercatat, status hunian aktif, kwitansi diproses                                                |
| 8       | Login client; periksa hunian, menu layanan dan unduh kwitansi setelah worker selesai                                                                                    | Kwitansi berisi nama, jumlah benar-benar dibayar, gedung, nomor/tipe kamar dan masa tinggal                                                                                       |

Tidak ada langkah check-in terpisah yang harus dilakukan penghuni setelah proses ini.

Angkatan kini dihitung otomatis dari dua digit awal NIM, misalnya `26` untuk 2026 dan `25` untuk 2025. Tidak ada input angkatan manual. Gunakan NIM numerik yang unik; jangan menyalin NIM akun demo. Mahasiswa baru/lama ditentukan dari angkatan dibandingkan tahun berjalan; kategori lokal hanya KIPK dan non-KIPK. Nonmahasiswa memakai nomor identitas dan tidak memiliki angkatan/prodi.

Saat membuat akun mahasiswa, pilih **fakultas → departemen → program studi/jenjang**. Mengubah fakultas mengosongkan departemen dan prodi; mengubah departemen mengosongkan prodi. Coba mengirim prodi dari departemen lain: server harus menolak. Tombol mata tersedia pada kedua input password.

Setelah login, calon penghuni mendapat popup pilihan **Pilih kamar / daftar asrama** atau **Layanan bebas asrama**. Tombol layanan tetap tersedia di dashboard setelah popup ditutup. Pada pendaftaran non-KIPK, pilih **gedung → tipe kamar → nomor kamar**, periksa periode aktif yang ditampilkan lalu periksa modal konfirmasi sebelum mengirim. A–E untuk perempuan, F–H untuk laki-laki, Nakes dan ASN untuk keduanya. Tipe Medium tersedia setelah admin membuat kamar dengan tipe tersebut. Peserta KIPK melewati pemilihan kamar dan ditempatkan admin.

**Periode tinggal berbeda dengan angkatan.** Semua pendaftaran baru mengikuti satu periode hunian aktif yang ditetapkan admin, termasuk mahasiswa angkatan lama. Bila tidak ada periode aktif, pendaftaran belum dapat dikirim. Nama periode dapat memuat tahun akademik dan semester; sistem mengikuti pengaturan admin.

**Stepper hanya muncul setelah login pada layanan yang dipilih**, dengan langkah Buat akun sudah selesai. Halaman daftar akun tidak menampilkan alur hunian. Tahap berikutnya menyesuaikan kategori:

- Hunian berbayar: pilih kamar → pembayaran → penghuni aktif.
- KIPK: ajukan hunian → penempatan admin → penghuni aktif; tanpa pilih kamar atau pembayaran pribadi.
- Internasional fasilitas gratis: pilih kamar → verifikasi dan penempatan → penghuni aktif; tanpa pembayaran pribadi.
- Surat bebas asrama: ajukan surat → verifikasi admin untuk riwayat lama atau pemeriksaan sistem untuk riwayat modern → surat terbit. Pelunasan ditampilkan bila alumni diverifikasi belum lunas.

Alumni yang hanya membutuhkan surat langsung memilih **Layanan bebas asrama**, tanpa mendaftar hunian atau memilih kamar kembali. Dashboard akun yang sudah checkout menyediakan tautan layanan tersebut. Angkatan lama sendiri tidak otomatis mengubah status hunian menjadi checkout; admin tetap memverifikasi riwayat sebelum sistem.

**Jalur cepat dan penolakan:**

| Akun client                        | Mulai dari                             | Pengujian                                                                                               |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `daftar-review@example.test`       | Pengajuan sudah dikirim                | Menunggu pembayaran; biarkan reservasi kedaluwarsa untuk melihat pengajuan dibatalkan dan kamar dilepas |
| `daftar-ditolak@example.test`      | Pengajuan ditolak                      | Baca alasan, perbaiki pilihan lalu ajukan ulang; invoice lama batal dan invoice baru terbit             |
| `tagihan-belum-bayar@example.test` | Tagihan belum dibayar                  | Periksa informasi jatuh tempo dan lanjutkan pembayaran sesuai form                                      |
| `bayar-verifikasi@example.test`    | Bukti sudah masuk, menunggu verifikasi | Admin menyetujui pembayaran; pendaftaran selesai otomatis tanpa review pendaftaran                      |
| `bayar-ditolak@example.test`       | Bukti pembayaran ditolak               | Client melihat alasan dan mengunggah bukti pengganti                                                    |

Uji bahwa kamar penuh/maintenance tidak dapat dipilih, pembayaran belum diverifikasi tidak mengaktifkan hunian, dan calon penghuni tidak dapat memakai layanan khusus penghuni aktif.

## 5. Pengaturan layanan dan invoice admin

**Akun:** `admin_layanan@example.test` → menu **Pengaturan Layanan** dan **Invoice**.

### Pengaturan Layanan

Halaman ini menjadi sumber kebenaran kategori, tarif, dan arsip. Uji setiap blok penyimpanan dengan toast sukses dan data yang tampil kembali.

| Blok            | Yang diuji                                                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Periode         | Aktifkan satu periode penerimaan; isi tahun angkatan maba (mis. 2026/2027 → 2026) dan jam reservasi (default 24). Mengaktifkan periode lain otomatis menonaktifkan sebelumnya; hanya satu periode aktif |
| Daftar KIP-K    | Tambah NIM, nama; angkatan diambil otomatis dari NIM. Pendaftar lokal hanya diperlakukan KIPK bila NIM+angkatannya tercatat di sini dan sesuai angkatan maba periode aktif                              |
| Tarif hunian    | Tetapkan nominal per gedung–tipe kamar–satuan (`period` atau `day`). Pendaftaran tanpa tarif untuk kombinasi terpilih ditolak, bukan ditagih nol                                                        |
| Kategori gedung | Batasi kategori penghuni yang boleh masuk tiap gedung (lokal KIPK/non-KIPK, internasional, non-mahasiswa)                                                                                               |
| Arsip alumni    | Tambah manual NIM (angkatan ≤2025), nama, gedung terakhir, keterangan, tanggal checkout opsional; dapat dibuat sebelum akun ada dan terhubung otomatis lewat NIM                                        |
| Impor arsip     | Template lima kolom `nim,nama,kode_gedung,checked_out_at,notes`, satu sheet, maksimal 500 baris; duplikat NIM dan baris bermasalah dibatalkan seluruhnya                                                |
| Tarif historis  | Tetapkan nominal per gedung–angkatan untuk alumni lama; kombinasi gedung–angkatan unik                                                                                                                  |

**Uji gagal:** mengaktifkan dua periode aktif sekaligus (ditolak), tarif historis tanpa gedung (ditolak), impor dengan header/beda kolom (ditolak dengan nomor baris).

### Invoice admin

1. Buka **Invoice**: cari, filter kategori/pembayar/status, urutkan nominal dan tanggal; saldo memperbarui setelah transaksi dan menyegarkan berkala tiap lima detik saat halaman terbuka.
2. Pilih beberapa tagihan milik beberapa klien, lalu terbitkan **invoice gabungan**: isi nomor, penerima, instansi, perihal, bank, rekening, atas nama, batas pembayaran, penandatangan, dan tanda tangan opsional. PDF tersimpan sebagai arsip tetap dan dapat diunduh ulang.
3. Catat pembayaran gabungan: masukkan referensi dan alokasi per tagihan asal; saldo tiap tagihan memperbarui tanpa piutang ganda. Pembayaran sponsor tercatat terpisah dari tagihan pribadi klien.
4. Pada satu tagihan, tetapkan **nominal pembayaran berikutnya** beserta VA (bank, nomor, atas nama) untuk cicilan yang disepakati di luar sistem; nominal ini yang ditagihkan ke klien pada pembayaran berikutnya.

**Uji gagal:** memilih tagihan tanpa sisa tagihan untuk pembayar terpilih, alokasi melebihi sisa, nomor invoice gabungan ganda, VA milik akun lain.

## 6. KIPK, internasional, dan nonmahasiswa

**Petugas:** `admin_layanan@example.test`.

### KIPK

1. Pastikan NIM pendaftar tercatat di **Pengaturan Layanan → Daftar KIP-K** (bagian 5). Pendaftar lokal yang mengaku KIPK tanpa tercatat di daftar diperlakukan non-KIPK: memilih kamar sendiri dan membayar.
2. Untuk dari awal, gunakan `mahasiswa.kipk@unand.ac.id` jika belum pernah digunakan, atau buat akun baru dengan jenis **Mahasiswa lokal** dan NIM yang tercatat pada daftar KIP-K admin. Tidak ada pilihan KIP-K manual pada Daftar.
3. Buka Pendaftaran Asrama dan ajukan periode. Pemilihan tipe/nomor kamar dilewati; invoice nol menunggu penempatan.
4. Admin membuka Review Pendaftaran, memilih kamar KIP-K yang tersedia lalu menekan **sahkan dan selesaikan penempatan**. Pendaftaran selesai tanpa pembayaran pribadi dan tanpa persetujuan ganda.
5. Periksa invoice: total yang ditagihkan ke klien nol, biaya tercatat sebagai piutang penanggung biaya (kolom sponsor), bukan hilang.
6. Klien tidak mengunggah bukti transfer pribadi dan tidak menerima kwitansi pembayaran fiktif; hunian aktif segera setelah pengesahan.
7. Untuk melanjutkan langsung dari tahap penempatan, gunakan `kipk-penempatan@example.test`. Untuk melihat kondisi sudah aktif, gunakan `kipk-aktif@example.test`.

Tagihan nol KIPK bukan bukti dana sponsor sudah diterima bank. Integrasi pembayaran sponsor/bank belum tersedia.

### Kategori lain

| Kategori                       | Akun dari tahap awal                                                             | Akun untuk melihat hasil aktif      | Alur yang diperiksa                                                                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Internasional fasilitas gratis | `international@unand.ac.id` jika belum dipakai, atau akun baru kategori tersebut | `internasional-gratis@example.test` | Tetap memilih kamar; invoice pribadi nol dengan piutang sponsor tercatat; aktif setelah admin mengesahkan penanggung biaya, tanpa menunggu sponsor membayar |
| Internasional berbayar         | Buat akun baru kategori internasional berbayar                                   | `internasional-bayar@example.test`  | Pilih kamar, bayar, verifikasi, kwitansi seperti alur berbayar; atau pilih penanggung biaya dan tunggu pengesahan admin                                     |
| Nonmahasiswa                   | `nonmahasiswa@unand.ac.id` jika belum dipakai, atau akun baru nonmahasiswa       | `nonmahasiswa-aktif@example.test`   | Pilih kamar dan selesaikan pembayaran; tidak menjadi mahasiswa binaan                                                                                       |
| Penghuni lokal lama            | `mahasiswa.penghuni@unand.ac.id` jika belum dipakai                              | `penghuni-lama@example.test`        | Hunian dapat aktif tetapi kategori hunian biasa: tanpa absensi/perizinan binaan                                                                             |

Akun dengan kondisi aktif bukan akun kosong untuk mengulang pendaftaran pertama.

## 7. Cicilan yang ditetapkan admin sampai pelunasan

Pengajuan cicilan oleh mahasiswa sudah dihapus dari sistem. Kesepakatan cicilan dibuat di luar aplikasi; admin yang menetapkan nominal pembayaran berikutnya beserta VA. UI selalu membedakan **total**, **sudah dibayar**, **sisa utang**, dan **harus dibayar sekarang**.

**Akun:** `tagihan-belum-bayar@example.test` atau client berbayar baru; `admin_layanan@example.test`. Jalur cepat termin berjalan: `cicilan-aktif@example.test` (termin pertama lunas).

1. Admin membuka **Invoice**, mencari tagihan klien, lalu menetapkan nominal pembayaran berikutnya dan VA (bank, nomor, atas nama). Belum ada API bank: sinkronisasi ke bank dan konfirmasi otomatis adalah tahap integrasi berikutnya.
2. Client membuka Tagihan: nominal yang diminta kini mengikuti penetapan admin, bukan seluruh sisa.
3. Client mengunggah bukti sebesar nominal tersebut; nominal lain ditolak form dengan pesan mengikuti tagihan/ajukan jadwal ke admin layanan.
4. Admin memverifikasi pembayaran. Penempatan dan status hunian aktif terjadi otomatis setelah nominal berikutnya terpenuhi; invoice masih menyimpan sisa utang.
5. Admin menetapkan nominal berikutnya, klien membayar, verifikasi ulang, sampai invoice lunas.
6. Periksa total, dibayar, sisa utang, kwitansi sesuai pembayaran yang disetujui, dan piutang sponsor yang tetap terpisah dari tagihan pribadi.

**Uji gagal:** nominal di luar penetapan admin, VA milik akun lain, bukti ditolak, dan permintaan surat saat masih ada tunggakan. Jangan melakukan transfer sungguhan ke VA demo; pengujian memakai bukti dan verifikasi manual.

## 8. Pendataan stok dan aset per kamar

**Akun:** `admin_aset@example.test` → `fasilitator@example.test` (W) atau `fasilitator@unand.ac.id` (P) → penghuni/GO pada pengujian berikutnya.

1. Admin aset membuka pengelolaan stok, menambah jenis stok dengan kode unik, nama, kategori, satuan dan jumlah total. Contoh: kode `UJI-KURSI`, nama Kursi uji, jumlah 10.
2. Periksa gedung DEMO-P/W, lantai dan kamar yang akan dipakai.
3. Fasilitator membuka Kelola Aset, memilih stok tersebut, kamar dalam gedung tugasnya, kode inventaris unik, jumlah dan kondisi.
4. Simpan alokasi 2 unit; periksa jumlah teralokasi dan sisa stok. Aset harus tercatat pada kamar yang dipilih.
5. Edit jumlah/kondisi dan pastikan perubahan terlihat. Uji hapus menggunakan aset percobaan yang belum dirujuk laporan/temuan inspeksi.
6. Coba mengalokasikan melebihi stok; sistem harus menolak. Admin juga tidak boleh menurunkan jumlah total stok di bawah yang sudah dialokasikan.
7. Fasilitator demo tidak boleh mengelola aset DEMO-T.
8. Login penghuni kamar tersebut untuk memeriksa pemilihan aset pada laporan kerusakan; GO harus melihatnya dalam inspeksi checkout kamar.

### Import aset

Gunakan fitur import pada Kelola Aset. Header file harus sesuai urutan berikut:

```csv
kode_gedung,nomor_lantai,nomor_kamar,kode_stok,jumlah,kode_inventaris,kondisi
DEMO-P,1,101,UJI-KURSI,2,UJI-P101-KURSI,baik
```

Untuk contoh import DEMO-P, gunakan `fasilitator@unand.ac.id`. Buat stok `UJI-KURSI` terlebih dahulu; pastikan kamar dan kode inventaris belum konflik. Format yang diterima: XLSX, XLS atau CSV, maksimal 5 MB, satu sheet, maksimal 500 baris data. Kondisi: `baik`, `rusak_ringan`, `rusak_berat`, atau `hilang`. Uji juga kode stok/kamar tidak dikenal, duplikasi kode inventaris, dan gedung di luar tugas fasilitator.

## 9. Pelaporan kerusakan sampai selesai

**Akun:** `binaan-aktif@example.test` atau client baru yang sudah aktif → `teknisi@example.test` → `pimpinan@example.test`.

1. Penghuni membuka Lapor Kerusakan, memilih barang/aset dan lokasi yang tersedia untuknya, mengisi deskripsi, lalu mengunggah foto awal.
2. Simpan dan catat nomor tiket. Periksa aset, kamar/gedung dan foto tersimpan sesuai laporan.
3. Teknisi membuka daftar tiket masuk, membuka detail tiket dan mulai mengerjakan melalui aksi yang tersedia.
4. Pimpinan memeriksa bahwa tiket dan status pengerjaan tampil pada pemantauan.
5. Teknisi menyelesaikan pekerjaan dengan deskripsi penyelesaian dan foto sesudah; keduanya wajib.
6. Penghuni dan pimpinan memeriksa status selesai, bukti dan waktu penyelesaian. Kondisi aset kembali baik bila tidak ada laporan terbuka lain untuk aset yang sama.

| Akun penghuni untuk jalur cepat | Kondisi awal                                |
| ------------------------------- | ------------------------------------------- |
| `penghuni-01@example.test`      | Tiket menunggu triage                       |
| `penghuni-02@example.test`      | Tiket sudah ditugaskan ke teknisi           |
| `penghuni-03@example.test`      | Sedang dikerjakan                           |
| `penghuni-04@example.test`      | Selesai, bukti tersedia dan penilaian final |
| `penghuni-05@example.test`      | Tiket dibatalkan                            |

**Uji gagal:** calon/nonpenghuni mengirim laporan, memilih aset yang tidak boleh diakses, menyelesaikan tanpa foto/deskripsi, atau teknisi yang tidak berhak mengubah tiket.

## 10. Monitoring perizinan

**Akun:** penghuni aktif → `fasilitator@example.test` jika perlu persetujuan → penghuni.

### Izin otomatis dari awal

1. Gunakan client baru yang sudah aktif dan belum pernah izin, atau penghuni demo yang tidak memiliki izin berjalan.
2. Buka Perizinan, pilih pulang kampung atau kegiatan, isi alasan, tujuan dan tanggal; dokumen pendukung opsional.
3. Kirim. Jika jumlah pengajuan sebelumnya paling banyak 6, status langsung **sedang izin**.
4. Saat sudah berangkat/sampai, unggah foto bukti sampai dan izinkan lokasi; gunakan tanggal berangkat yang tidak masih di masa depan.
5. Periksa status **sudah sampai**, foto, waktu dan koordinat pada monitoring fasilitator.
6. Setelah kembali, unggah foto bukti kembali dengan lokasi. Status menjadi **selesai kembali** dan riwayat tetap tersedia.

### Izin yang perlu verifikasi

1. Login `izin-review@example.test`; akun ini memiliki tujuh izin sebelumnya dan pengajuan berikutnya menunggu keputusan.
2. Login fasilitator, buka Perizinan dan detail pengajuan dalam gedung tugasnya.
3. Setujui untuk melanjutkan bukti sampai/kembali, atau tolak dengan alasan untuk menguji jalur penolakan. Kedua pilihan adalah cabang terpisah; setelah ditolak, gunakan pengajuan baru untuk mencoba persetujuan.
4. Login penghuni untuk memeriksa keputusan; jika disetujui, lanjutkan dua tahap unggah bukti.

| Akun                          | Digunakan untuk                                              |
| ----------------------------- | ------------------------------------------------------------ |
| `izin-otomatis@example.test`  | Izin ketujuh sudah otomatis berjalan; lanjutkan bukti sampai |
| `izin-sampai@example.test`    | Sudah sampai; lanjutkan bukti kembali                        |
| `izin-terlambat@example.test` | Monitoring sudah lewat rencana kembali                       |
| `izin-kembali@example.test`   | Melihat riwayat lengkap yang sudah selesai                   |
| `penghuni-06@example.test`    | Melihat contoh izin ditolak                                  |

Batas dihitung dari pengajuan **sebelumnya**: izin ketujuh masih otomatis bila sebelumnya tepat enam; izin kedelapan memerlukan verifikasi bila sebelumnya tujuh. Bukti kembali sebelum bukti sampai dan pengajuan baru saat masih ada izin terbuka harus ditolak. Waktu/lokasi dicatat saat unggah; proses ini bukan pengenalan otomatis isi foto atau pembuktian lokasi dari EXIF foto.

## 11. Kegiatan dan QR dalam satu alur

**Akun:** `fasilitator@example.test` untuk **DEMO-W** dengan peserta `binaan-aktif@example.test`. Untuk **DEMO-P**, gunakan `fasilitator@unand.ac.id` dengan peserta `kipk-aktif@example.test`. Password awal tetap `password`.

Kelayakan peserta: mahasiswa lokal angkatan **2026 ke atas**, masih tahun pertama hunian, aktif, dan belum checkout/masuk kembali. Angkatan saja tidak cukup. Data demo dapat kehilangan kelayakan ketika tanggal pengujian melewati tahun pertama.

### Penugasan dan master jenis kegiatan

1. Login `staff_admin@example.test` atau superadmin → **Data Master → Penugasan Fasilitator**.
2. Pilih akun fasilitator dan satu gedung. Fasilitator hanya memiliki satu penugasan; beberapa fasilitator boleh ditugaskan ke gedung yang sama.
3. Login fasilitator. Dashboard menampilkan **Gedung penugasan Anda**, kode gedung, serta jumlah kamar/penghuni hanya di gedung itu. Tanpa penugasan, tampil keterangan dan pembuatan kegiatan tidak tersedia.
4. Di **Data Master → Jenis Kegiatan**, periksa **Sholat Subuh** dan **Lainnya**. Admin dapat menambah jenis lain. Jenis Lainnya dan jenis yang sudah digunakan tidak dapat dihapus.
5. Penggantian/penghapusan penugasan menutup QR aktif fasilitator yang bersangkutan. Penugasan lama yang ambigu karena mencakup beberapa gedung diarsipkan saat migrasi dan perlu ditetapkan ulang; seeder menyiapkan penugasan akun demo.

### Membuat kegiatan dan melakukan scan

1. Fasilitator → **Kegiatan & Absensi → Buat kegiatan & QR**.
2. Gedung otomatis mengikuti penugasan. Tidak ada pilihan kegiatan umum lintas gedung.
3. Pilih **Sholat Subuh**: nama mengikuti master. Pilih **Lainnya** untuk mengisi nama kegiatan sendiri.
4. Isi **durasi QR dalam menit** dan **radius dalam meter**. Tidak ada input tanggal mulai, selesai, atau alamat lokasi manual.
5. Izinkan GPS. Peta Leaflet menampilkan titik perangkat, lingkaran radius absensi, dan perkiraan akurasi GPS. Akurasi harus berada dalam batas radius yang dipilih (misalnya ±80 m diterima untuk radius 100 m). Tombol Perbarui GPS menunggu pembacaan lebih baik sampai 12 detik. Jika lokasi masih terlalu kasar, aktifkan lokasi presisi atau gunakan perangkat dengan GPS; sesuaikan radius hanya jika sesuai area kegiatan.
6. Klik **Buat kegiatan & QR**. Sistem mengambil GPS baru, mencatat waktu mulai server saat penyimpanan, menghitung selesai dari durasi, dan membuat **satu QR untuk satu kegiatan**.
7. Preview terbuka. Biarkan preview fasilitator pembuat QR tetap terbuka agar GPS diperbarui setiap 20 detik. Fasilitator harus tetap dalam radius.
8. Di browser/perangkat lain, login mahasiswa → **Scan QR / Absensi**, izinkan kamera dan GPS, lalu pindai QR.
9. Mahasiswa dan fasilitator harus berada dalam radius yang sama dengan lokasi cukup akurat. Mahasiswa harus termasuk peserta binaan gedung itu.
10. Periksa peserta berpindah menjadi Hadir dengan pencatatan **Scan QR**. Pindai ulang tidak boleh menambah kehadiran.
11. Tutup dan buka kembali detail kegiatan: QR yang sama tersedia selama belum kedaluwarsa. Setelah sesi selesai, riwayat tetap tersedia; buat kegiatan baru untuk QR baru.

### Preview, kelompok lantai, dan koreksi manual

- Tabel kegiatan menyimpan kegiatan berlangsung dan riwayat. Buka ikon detail untuk QR, peta, dan daftar peserta.
- Tab **Semua**, **Hadir**, dan **Belum hadir** menampilkan jumlah peserta. Filter **Lantai** mengelompokkan penghuni, sedangkan filter **Pencatatan** membedakan scan, koreksi manual, dan belum scan.
- Nama, NIM, lantai, dan kamar tersedia. Daftar diperbarui setiap 5 detik.
- Daftar peserta serta lantai/kamar merupakan snapshot saat QR dibuat, sehingga riwayat tidak berubah ketika penghuni kemudian pindah atau checkout.
- Fasilitator lain di gedung yang sama boleh melihat daftar dan mengoreksi kehadiran. QR dan pembaruan GPS tetap dipegang fasilitator pembuat kegiatan.
- Klik ikon edit peserta → pilih hadir/tidak hadir → isi alasan minimal 5 karakter → simpan. Koreksi dapat dilakukan setelah sesi berakhir.
- Koreksi menyimpan alasan, petugas, waktu, dan perubahan pada Audit Log. Koreksi manual tidak menghasilkan bukti scan GPS palsu. Bukti scan awal tetap tersimpan jika kehadirannya dikoreksi.
- Klik **Akhiri absensi** untuk menutup lebih awal. QR tidak bisa diaktifkan kembali untuk kegiatan itu.

### Pengujian penolakan

| Percobaan                                                  | Hasil yang diharapkan                                  |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| Mahasiswa berada di luar radius                            | Tidak mencatat kehadiran                               |
| Fasilitator keluar radius, pembaruan lokasi sudah diterima | Scan ditolak meskipun mahasiswa berada di dalam radius |
| GPS fasilitator tidak diperbarui lebih dari 60 detik       | Scan ditolak                                           |
| GPS ditolak atau akurasi melebihi batas radius sesi        | Tidak boleh berhasil                                   |
| Durasi habis atau sesi ditutup lebih awal                  | QR ditolak                                             |
| Penghuni P memindai QR W                                   | Ditolak karena gedung berbeda                          |
| Penghuni lama, internasional, atau nonmahasiswa            | Tidak memenuhi binaan                                  |
| Fasilitator tanpa penugasan atau mencoba gedung lain       | Pembuatan/akses ditolak                                |
| Koreksi tanpa alasan, oleh mahasiswa, atau lintas gedung   | Ditolak                                                |
| Peserta sudah memiliki catatan kehadiran/koreksi           | Scan tidak menambah catatan baru                       |

Peta Leaflet menampilkan layer Google Maps hybrid tanpa API key, mengikuti pendekatan [TA-SIMBIMA](https://github.com/syaunabiih/TA-SIMBIMA/blob/main/client/src/pages/fasilitator/TambahKegiatanPage.jsx). Peta memerlukan koneksi internet; jika tile Google gagal dimuat, tampilan beralih ke OpenStreetMap. Tidak ada konfigurasi key tambahan. Pergantian layer peta tidak meningkatkan akurasi GPS perangkat, dan menggeser peta tidak mengubah titik GPS absensi.

Pengujian endpoint otomatis tidak menggantikan percobaan kamera/GPS perangkat nyata; gunakan HTTPS untuk akses lintas perangkat.

## 12. Checkout: penghuni → GO → fasilitator

**Dari awal:** client baru yang sudah aktif. **Jalur cepat:** `checkout-pengajuan@example.test` (DEMO-P), diselesaikan oleh `fasilitator@unand.ac.id`. Akun `checkout-siap` juga di P; `checkout-rusak` di W memakai `fasilitator@example.test`.

| Langkah | Akun dan tindakan                                                             | Hasil yang diperiksa                                                                 |
| ------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1       | Penghuni membuka Checkout, membaca syarat/mekanisme, lalu mengajukan          | Pengajuan tercatat; kamar belum langsung kosong                                      |
| 2       | GO `go@example.test` membuka pemeriksaan checkout dan detail penghuni         | Identitas, kamar dan daftar aset benar                                               |
| 3       | GO menghitung seluruh aset, mengisi jumlah fisik, kondisi, dan catatan temuan | Semua aset kamar harus diperiksa; jumlah/kondisi tidak sesuai harus disertai catatan |
| 4       | GO menyelesaikan inspeksi                                                     | Pemeriksaan selesai; temuan rusak/hilang terkait laporan kerusakan                   |
| 5       | Fasilitator membuka penyelesaian checkout gedung tugasnya dan menyelesaikan   | Status penghuni keluar, penempatan berakhir, riwayat checkout tercatat               |
| 6       | Admin/fasilitator memeriksa kamar dan penghuni                                | Kapasitas tersedia diperbarui sesuai penghuni lain yang masih tinggal                |

Kamar tidak selalu menjadi kosong jika masih ada penghuni lain. Kamar berstatus maintenance tetap maintenance. Pengajuan saja tidak boleh melepaskan kamar sebelum inspeksi dan penyelesaian fasilitator.

Gunakan `checkout-siap@example.test` untuk langsung menyelesaikan checkout, atau `checkout-rusak@example.test` untuk memeriksa temuan kerusakan dan tiketnya. Coba menyelesaikan sebelum inspeksi lengkap: harus ditolak. Setelah checkout, layanan penghuni aktif dan absensi tidak lagi boleh dipakai.

## 13. Surat bebas asrama angkatan 2026 ke atas

**Akun:** client perjalanan lengkap setelah checkout, atau `checkout-selesai@example.test`.

1. Pastikan checkout selesai, tidak ada penempatan aktif dan seluruh tagihan lunas.
2. Login client → Pengajuan Bebas Asrama → isi form dan ajukan.
3. Sistem memeriksa riwayat hunian/checkout dan tagihan, lalu menyetujui bila syarat terpenuhi. Jalur modern tidak memerlukan verifikasi manual ulang oleh admin.
4. Tunggu worker menyelesaikan PDF; periksa notifikasi dan unduh surat dari akun.
5. Periksa identitas, nomor, logo UNAND dan judul surat. Format mengikuti contoh pengelola: surat telah membayar untuk alumni berbayar; surat tidak tinggal untuk klasifikasi bukan alumni; format bebas asrama umum sementara bagi kategori subsidi. Penandatangan mengikuti `RESIDENCE_LETTER_SIGNER`; tanda tangan tidak dibuat otomatis. Nomor resmi mengikuti input admin bila tersedia, bukan menyalin nomor contoh PDF.
6. Periksa status akun nonaktif setelah persetujuan: transaksi penghuni ditutup, tetapi akun masih dapat login, membaca arsip surat, dan memulai pendaftaran hunian kembali secara mandiri. Surat lama tetap terunduh dan pengiriman ulang tidak menonaktifkan kembali akun yang sudah daftar ulang.

`surat-modern@example.test` sudah memiliki surat terbit; gunakan untuk melihat hasil, bukan mengulang perjalanan penghuni aktif. Coba mengajukan dari penghuni yang belum checkout atau masih berutang: tidak boleh menerbitkan surat.

## 14. Surat bebas asrama angkatan 2025 ke bawah

**Persiapan admin (bagian 5):** lengkapi **Pengaturan Layanan** terlebih dahulu — arsip alumni (NIM, nama, angkatan, gedung terakhir) dan tarif historis per gedung–angkatan. Arsip dapat dibuat sebelum akun client ada; koneksi terjadi otomatis lewat NIM. Tarif yang belum tersedia tidak dianggap nol: pengajuan alumni ditolak sampai admin melengkapinya.

**Client:** daftar/akses dengan angkatan 2025 atau sebelumnya, lalu buka Pengajuan Bebas Asrama. Jenis surat dan jalur pemeriksaan mengikuti riwayat hunian, arsip alumni, serta tagihan; tidak ada dropdown klasifikasi. Alumni yang sudah membayar di luar sistem dapat mengunggah bukti pembayaran beserta rekening koran untuk diperiksa admin.

### A. Alumni sudah lunas

1. Client mengunggah **bukti pembayaran** dan **rekening koran** sebagai bukti pelunasan lama; keduanya wajib diunggah bersama. Jalur cepat bukti tersedia: `legacy-lunas@example.test`.
2. Pengajuan berstatus diajukan; tidak ada invoice yang terbit otomatis sebelum admin memutuskan.
3. Admin membuka Approval Bebas Asrama, membuka kedua dokumen, memeriksa identitas, lalu menyetujui.
4. Sistem menerbitkan invoice historis sesuai tarif gedung–angkatan arsip, mencatat pelunasan historis (sisa tagihan menjadi nol, nilai invoice dan riwayat tetap), menerbitkan PDF dan menonaktifkan akun.
5. Client memeriksa surat/notifikasi. Untuk jalur gagal, admin menolak dengan alasan dokumen tidak sesuai; `legacy-ditolak@example.test` dipakai untuk melihat alasan, memperbaiki bukti dan mengajukan ulang.

### B. Alumni belum lunas

1. Alumni mengajukan tanpa bukti pelunasan lama; sistem membuat invoice dari tarif gedung–angkatan arsipnya. Jika arsip atau tarif belum lengkap, pengajuan ditolak dengan pesan melengkapi arsip/tarif — lengkapi di Pengaturan Layanan, jangan menagih nol.
2. Invoice menyimpan salinan tarif saat terbit; perubahan tarif berikutnya hanya berlaku untuk tagihan baru.
3. Jalur cepat: login `legacy-belum-lunas@example.test`, yang sudah mempunyai invoice historis.
4. Client membuka Tagihan dan mengunggah bukti pembayaran; pembayaran sebagian diizinkan.
5. Admin membuka Verifikasi Pembayaran dan menyetujui bukti yang sesuai. Status surat tetap diverifikasi sampai sisa tagihan nol.
6. Setelah seluruh kewajiban lunas dan tidak ada hunian aktif, surat diproses otomatis; client mengunduh PDF dan akun nonaktif.

### C. Tidak pernah tinggal

1. Gunakan client yang tidak punya riwayat hunian maupun arsip, atau `legacy-bukan-alumni@example.test`.
2. Client mengajukan surat; sistem memeriksa riwayat dan arsip alumni. Bila benar tidak ada dan tidak ada tunggakan, **Surat Keterangan Tidak Tinggal di Asrama** terbit otomatis tanpa verifikasi admin dan akun nonaktif.
3. Bila ditemukan dalam arsip/riwayat, sistem mengikuti jalur alumni dan kewajiban terkait; tidak menerbitkan surat tidak tinggal. Pengiriman klasifikasi palsu dari browser tidak boleh mengubah hasil klasifikasi server. `legacy-surat-terbit@example.test` adalah contoh kondisi akhir.

### Pemeriksaan halaman admin dan dokumen

Uji tab Semua, Menunggu verifikasi, Diverifikasi, Disetujui, dan Ditolak; jumlah/list harus sesuai status. Buka detail untuk identitas, bukti (tautan unggahan), alasan penolakan, tagihan dan PDF. Surat yang sudah terbit tidak boleh diedit menjadi keputusan lain; admin tetap dapat menolak dengan catatan sebelum surat terbit.

Pengiriman email pada konfigurasi sekarang memakai `MAIL_MAILER=log`: periksa log aplikasi, bukan inbox sungguhan. Notifikasi akun dan PDF tetap dapat diuji. Email nyata memerlukan konfigurasi SMTP tersendiri.

## 15. Keuangan dan pemantauan pimpinan

**Akun:** `staff_admin@example.test` atau `superadmin@example.test` untuk buku kas; `pimpinan@example.test` untuk pemantauan.

1. Setelah pembayaran client disetujui, periksa transaksi terkait pada Keuangan dan cocokkan nominal/referensi dengan pembayaran.
2. Buka detail. Transaksi otomatis pembayaran hanya bisa dilihat; tidak boleh diedit/dihapus lewat buku kas.
3. Tambah transaksi manual melalui modal, isi kategori, tipe, tanggal, nominal dan deskripsi; simpan.
4. Cari transaksi manual tersebut, buka detail, edit lalu hapus untuk menguji CRUD transaksi manual.
5. Login pimpinan untuk memeriksa ringkasan keuangan, aset dan progres kerusakan berdasarkan data yang baru diuji.

## 16. Orang tua, superadmin dan konten landing

### Orang tua

Login `orang_tua@example.test`. Dashboard menampilkan anak yang terhubung, yaitu `binaan-aktif@example.test`. Cocokkan data anak dan riwayat yang ditampilkan. Akun ini tidak otomatis terhubung dengan client baru yang Anda buat dan tidak boleh melihat seluruh mahasiswa atau pembayaran penghuni lain.

### Superadmin

Login `superadmin@example.test`, periksa Akun & Role dan Audit Log. Gunakan akun percobaan terpisah saat menguji perubahan role agar akun petugas demo tetap dapat dipakai untuk langkah lainnya. Pastikan pengguna biasa tidak mendapatkan menu atau akses operasi superadmin.

### Konten landing

Login `staff_admin@example.test`, buka pengelolaan profil, informasi, program dan testimoni. Uji tambah/edit konten pada halaman editor, pemformatan rich text yang tersedia, simpan lalu periksa hasil di halaman publik tanpa login. Gunakan konten berlabel uji; periksa gambar dan slider testimoni. Hapus hanya konten percobaan yang Anda buat.

## 17. Hunian sementara, laundry dan galon

### Hunian sementara: Summer Course dan nonmahasiswa

Admin layanan membuka **Hunian Sementara** untuk Summer Course; fasilitator memakai menu yang sama untuk nonmahasiswa di gedung penugasannya. Siapkan periode aktif dan tarif **per hari** untuk gedung–tipe kamar yang diuji.

1. Isi identitas, email, jenis kelamin, kamar, tanggal masuk dan tanggal keluar. Tanggal keluar harus setelah tanggal masuk; tanggal keluar tidak dihitung sebagai malam menginap.
2. Simpan: kamar langsung dialokasikan dan invoice pribadi dibuat. Akun yang sudah ada harus memakai identitas yang sesuai dan tidak sedang memiliki hunian aktif. Peserta Summer Course tidak memperoleh layanan binaan.
3. Peserta Summer Course maupun nonmahasiswa **tidak masuk role mahasiswa**. Identitas tetap tersimpan sebagai pengguna dengan role non-login `tamu` (tanpa permission) agar relasi penempatan kamar dan tagihan tetap utuh, tetapi mereka tidak muncul di Data Mahasiswa, dashboard, maupun rekap penghuni aktif, dan tidak bisa membuka halaman role mana pun.
4. Pada tanggal keluar, scheduler mengakhiri hunian dan mengirim notifikasi dalam aplikasi kepada fasilitator gedung. Kamar masih terisi bila ada penghuni lain; maintenance tetap maintenance. Sisa utang tidak dihapus.
5. Uji tarif belum tersedia, kamar penuh/maintenance, dan fasilitator lintas gedung: penyimpanan ditolak tanpa meninggalkan invoice atau akun baru sebagian.

Docker menjalankan scheduler. Untuk pengujian lokal, jalankan `php artisan schedule:work` di terminal tersendiri. Akun yang dibuat petugas memakai password acak; pengaturan password dilakukan melalui Lupa password, dengan email mengikuti konfigurasi mailer aplikasi.

### Laundry dan galon

Belum ada langkah transaksi yang harus diuji karena proses bisnis belum ditentukan. Tidak adanya pemesanan laundry/galon saat ini memang sesuai ruang lingkup; jangan menganggapnya sebagai transaksi yang seharusnya aktif.

## 18. Pemeriksaan tabel pada setiap modul

Gunakan daftar dengan banyak data, misalnya Data Mahasiswa, Review Pendaftaran, Verifikasi Pembayaran, Invoice, Pengaturan Layanan dan Bebas Asrama.

- Cari berdasarkan identitas yang relevan dan coba kata yang tidak ditemukan.
- Gunakan dropdown filter yang tersedia, lalu kembalikan ke semua data.
- Klik judul kolom yang dapat diurutkan; pastikan arah urutan berubah.
- Ubah jumlah baris per halaman, pindah halaman dan periksa nomor urut serta total data.
- Periksa warna zebra, keterbacaan teks, kolom Aksi dan tooltip ikon.
- Buka detail baris pertama: tooltip tidak boleh tertutup header.
- Periksa detail menampilkan identitas dan informasi transaksi yang tepat.
- Aksi harus mengikuti status serta hak akses; transaksi selesai/terkunci tidak selalu memiliki tombol edit/hapus.

## 19. Jika hasil berbeda atau proses berhenti

| Gejala                                          | Yang diperiksa                                                                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Akun demo sudah berada di tahap berikutnya      | Akun pernah diuji; seeding ulang tidak mereset. Gunakan client baru atau database uji bersih                               |
| Login tidak sama dengan panduan                 | Password mungkin sudah diganti; `password` hanya nilai awal seeder                                                         |
| Menu penghuni belum muncul                      | Pembayaran memenuhi syarat/cicilan pertama yang ditetapkan admin telah terverifikasi dan status hunian aktif               |
| Menu absensi/perizinan tidak ada untuk penghuni | Memang tersembunyi bagi yang bukan binaan: hanya mahasiswa lokal angkatan maba periode aktif pada hunian pertama           |
| Akun nonaktif setelah surat                     | Masih dapat login, membaca arsip surat, dan mendaftar kembali; blokir penuh hanya dari status nonaktif oleh admin          |
| Pengajuan alumni ditolak minta arsip/tarif      | Lengkapi arsip alumni dan tarif historis di Pengaturan Layanan; invoice tidak boleh terbit nol                             |
| Fasilitator tidak melihat data                  | Gedung harus sesuai penugasan: `fasilitator@example.test` W, `fasilitator@unand.ac.id` P                                   |
| QR tidak tersedia                               | Buka detail Kegiatan & Absensi sebagai pembuat; periksa gedung, GPS, durasi dan status sesi                                |
| Scan ditolak                                    | Kelayakan binaan, lokasi/akurasi kedua pihak, pembaruan lokasi fasilitator, waktu, dan scan duplikat                       |
| PDF belum siap                                  | Worker antrean; periksa `php artisan queue:failed` dan log aplikasi sebelum mengulang transaksi                            |
| Tidak ada email di inbox                        | Konfigurasi masih mailer log                                                                                               |
| Surat ditolak                                   | Checkout selesai, tidak ada hunian aktif, seluruh tagihan lunas; legacy juga memerlukan klasifikasi/bukti sesuai cabangnya |
| Kamar tidak kosong setelah checkout             | Masih ada penghuni lain atau kamar maintenance                                                                             |
| Gagal import aset                               | Header/format file, stok, kamar, kode inventaris, jumlah tersedia dan akses gedung                                         |
| Tampilan lama masih muncul                      | Refresh browser; pastikan build terbaru dijalankan pada server/container yang sedang dibuka                                |

## 20. Catatan hasil uji

Salin tabel berikut untuk setiap percobaan. Catat hasil nyata, bukan hanya status akhir yang diharapkan.

| Tanggal | Proses/cabang | Akun client | Akun petugas | Nomor invoice/tiket/izin | Hasil diharapkan | Hasil aktual | Lulus/gagal |
| ------- | ------------- | ----------- | ------------ | ------------------------ | ---------------- | ------------ | ----------- |
|         |               |             |              |                          |                  |              |             |

Prioritas perjalanan pertama: **pendaftaran berbayar → penghuni aktif → kerusakan → izin → absensi → checkout → surat modern**. Gunakan akun legacy dan kategori khusus secara terpisah untuk cabang yang tidak dapat dilalui oleh client perjalanan pertama.
