# UAT Modul Pelaporan dan Kerusakan Andalas Residence

Tanggal: **11 November 2026**. Acuan: PROSES PELAPORAN, Gap.xlsx beserta Validasi Stake Holder, To-Be Bizagi dan keputusan tambahan pengguna.

Status panduan: **refaktor diterapkan; pengujian akhir sedang berjalan**. Kolom hasil UAT diisi oleh penguji; keberadaan panduan tidak berarti client sudah menerima seluruh skenario.

## 1. Rekap akun

Gunakan **login akun biasa**, dengan **password: `password`** untuk akun UAT. Akun berasal dari **ResidenceRegistrationUatSeeder yang sudah ada**, tanpa seeder terpisah dan tanpa tambahan pengaturan .env. Akun yang sudah pernah dipakai melanjutkan kondisi terakhir; seed ulang tidak menghapus transaksi atau mengembalikan skenario ke awal.

| Email login | Peran | Dipakai untuk |
| --- | --- | --- |
| uat.superadmin@example.test | Superadmin | Persiapan, akun, penugasan gedung, pemeriksaan dan penilaian teknisi. |
| uat.pengelola@example.test | Admin layanan | Persiapan hunian dan pendampingan administrasi; bukan teknisi penyelesai tiket. |
| uat.pimpinan@example.test | Pimpinan | Perintah pekerjaan, monitoring dan aktivitas harian. |
| uat.fasilitator@example.test | Fasilitator A | Melihat laporan dan foto pada gedung penugasannya. |
| uat.fasilitator2@example.test | Fasilitator B | Uji penolakan akses gedung A. Periksa penugasan aktual. |
| uat.aset@example.test | Admin aset | Inventaris dan pengaitan aset yang belum tercatat. |
| uat.inspeksi@example.test | Petugas GO | Temuan checkout dan kaitannya dengan tiket kerusakan. |
| uat.teknisi@example.test | Teknisi 1 | Penanggung jawab: mengambil, mengatur anggota, progres dan menyelesaikan. |
| uat.teknisi2@example.test | Teknisi 2 | Anggota tim atau pesaing klaim, sesuai skenario. |
| uat.teknisi3@example.test | Teknisi 3 | Teknisi di luar tim; uji akses yang harus ditolak. |
| uat.lokal@example.test | Mahasiswa S1 | Pelapor utama setelah check-in. |
| uat.teman@example.test | Mahasiswa S1 | Teman sekamar pelapor utama setelah check-in pada kamar yang sama. |
| uat.kipk@example.test | Mahasiswa KIP-K | Ulangi alur pelaporan setelah alokasi dan check-in yang sah. |
| uat.s2@example.test | Mahasiswa S2 | Variasi penghuni S2 atau penghuni kamar lain. |
| uat.s3@example.test | Mahasiswa S3 | Variasi S3 atau penghuni gedung lain. |
| uat.internasional@example.test | Internasional | Variasi penghuni internasional setelah check-in. |
| uat.bulanan@example.test | Mahasiswa non-maba | Variasi penghuni dengan skema bulanan setelah check-in. |
| uat.keuangan@example.test | Admin layanan | Tetap tersedia untuk UAT pendaftaran/keuangan; bukan aktor wajib perbaikan. |

Seeder sekarang mencakup **18 akun**. Lima tambahan pelaporan adalah teknisi, teknisi2, teknisi3, aset dan fasilitator2. Password UAT direset menjadi password saat seed ulang; role, penugasan dan transaksi akun yang sudah ada dipertahankan. Fasilitator kedua hanya diberi penugasan otomatis bila tersedia gedung lain; bila belum ada, tetapkan melalui menu master penugasan sebelum uji lintas gedung.

Perintah setelah kode terbaru dan migration tersedia: `docker compose exec -T andalas-app php artisan db:seed --class=ResidenceRegistrationUatSeeder --force --no-interaction`. Ini menyiapkan akun, bukan menjalankan UAT. Jangan menganggap akun sudah ada di produksi sebelum perintah dijalankan di server tersebut.

## 2. Persiapan sekali sebelum mulai

1. Catat URL lingkungan, versi kode, tanggal dan nama penguji. Gunakan data uji yang dapat dikenali; jangan menjalankan migrate fresh untuk memulai UAT pada database operasional.
2. Pastikan migration terbaru sudah dijalankan, kemudian seed akun di atas. Masuk sebagai superadmin dan periksa role serta status aktifnya.
3. Melalui alur pendaftaran, selesaikan pelengkapan profil, alokasi, dokumen dan check-in untuk uat.lokal serta uat.teman pada kamar yang sama. **Akun baru masih calon; harus ada status penghuni aktif dan penempatan aktif.** Pembayaran saja tidak cukup.
4. Siapkan uat.s2 pada kamar berbeda dan uat.s3 pada gedung berbeda. Siapkan satu calon yang belum check-in untuk uji penolakan. Ulangi kategori KIP-K/internasional/bulanan setelah syarat check-in kategorinya terpenuhi.
5. Tetapkan fasilitator A ke gedung pelapor dan fasilitator B ke gedung lain. Nama A/B di panduan adalah penanda pengujian, bukan kewajiban memakai kode gedung tertentu.
6. Siapkan inventaris kamar pelapor, satu fasilitas bersama dan satu lokasi tanpa inventaris. Siapkan foto awal dan hasil JPG/PNG, masing-masing maksimal 5 MB. Jangan memakai kejadian yang sama untuk setiap variasi tanpa menutup/menautkannya.
7. Pastikan queue worker dan scheduler berjalan agar pemberitahuan diproses. Pengiriman aplikasi memakai antrean tahan gagal; tidak menunggu email/WhatsApp untuk menyelesaikan tiket.
8. Buka **Pelaporan dan pekerjaan teknisi** pada portal, atau URL `/pelaporan`. Gunakan jendela privat/profil browser terpisah untuk setiap peran agar sesi tidak tertukar.

Catat sebelum uji: gedung pelapor ___; kamar pelapor ___; fasilitator A ___; gedung pembanding ___; inventaris ___; ID/nomor tiket yang dibuat ___. Akun UAT tidak otomatis mempunyai kamar aktif hanya karena berhasil login.

## 3. Alur utama yang dicoba lebih dahulu

| Tahap | Akun dan tindakan | Hasil yang diharapkan |
| --- | --- | --- |
| 1. Lapor | Lokal: buat laporan, pilih aset atau tanpa inventaris, isi lokasi/deskripsi dan foto awal. | Nomor tiket muncul; status belum dimulai; langsung masuk daftar teknisi tanpa persetujuan fasilitator wajib. |
| 2. Pantau | Teman: buka laporan kamar. Fasilitator A dan pimpinan membuka monitoring. | Detail lengkap sesuai haknya tersedia. Penghuni/gedung lain tidak ikut mendapat akses. |
| 3. Ambil | Teknisi 1: klik Ambil pekerjaan. | Penanggung jawab tercatat dan status menjadi sedang dikerjakan. |
| 4. Bentuk tim | Teknisi 1: pilih Teknisi 2, isi alasan lalu simpan anggota. | Satu penanggung jawab tetap; Teknisi 2 dapat melihat dan menulis progres. Teknisi 3 di luar tim tidak dapat mengambil alih. |
| 5. Progres | Teknisi 2: isi tanggal, uraian dan penanda hambatan material/akses. | Progres muncul pada tiket dan rekap harian; tiket tetap dikerjakan. |
| 6. Perintah | Pimpinan: catat instruksi perbaikan di lokasi lain. | Sumber perintah terlihat; tiket yang sedang dikerjakan tidak otomatis dihentikan. |
| 7. Tuntaskan | Teknisi 1: isi catatan akhir dan unggah bukti final. | Status otomatis selesai, assignment aktif ditutup dan histori final disimpan sekali. Anggota tidak mempunyai tombol penyelesaian. |
| 8. Lihat hasil | Lokal dan teman: buka bukti hasil serta pemberitahuan. Pimpinan: periksa dashboard/harian. | Bukti privat dapat dibuka oleh yang berhak, hasil terbaca dan jumlah status benar. Rating bukan syarat penutupan. |

Setelah alur utama, ulangi tahap 1-8 menggunakan KIP-K, S2, S3, internasional dan bulanan yang sudah menjadi penghuni aktif. Kategori pendaftaran tidak boleh menghilangkan hak pelaporan penghuni yang sah. Gunakan lokasi/kejadian berbeda agar hasil tidak tercampur kontrol duplikasi.

## 4. Pemeriksaan kelengkapan To-Be

Nomor U01-U35 sama dengan rancangan audit agar hasil mudah ditelusuri. Hasil setiap baris: **Lulus / Gagal / Belum diuji / Terhambat**, disertai bukti. Kasus dua proses, request key, migration dan pemeriksaan database dikerjakan pendamping teknis; penguji client berfokus pada alur dan hak peran.

### A. Pelaporan dan akses

| ID | Pelaku / langkah | Hasil yang wajib terlihat |
| --- | --- | --- |
| U01 | Lokal aktif mengirim laporan aset kamar sendiri. | Tiket, lokasi, foto dan histori tercatat; langsung tersedia bagi teknisi. |
| U02 | Calon belum check-in mencoba melapor. | Ditolak, tanpa tiket atau file sisa. |
| U03 | Pendamping mengirim aset/kamar milik penghuni lain lewat request. | Server menolak, walaupun isian dimanipulasi. |
| U04 | Lokal melapor fasilitas bersama. | Lokasi berada pada gedung/fasilitas yang benar, bukan kamar pribadi. |
| U05 | Lokal melapor lokasi tanpa inventaris. | Laporan tetap dapat dibuat; aset boleh kosong. |
| U06 | Fasilitator B membuka daftar/detail/foto dan mencoba tindakan tiket A. | Tidak dapat mengakses atau memutasi tiket di luar kewenangannya. |
| U07 | Teman aktif sekamar membuka laporan dan bukti hasil. | Deskripsi, foto awal/final serta histori yang berhak terlihat lengkap. |
| U08 | Mantan teman atau penghuni baru mencoba laporan sebelum masa tinggalnya. | Akses berdasarkan kamar ditolak; laporan milik sendiri tetap mengikuti hak pelapor. |
| U09 | Salin URL foto ke akun kamar lain atau browser tanpa login. | File tetap privat dan tidak dapat dibuka. |

### B. Kejadian ganda dan pengiriman ulang

| ID | Pelaku / langkah | Hasil yang wajib terlihat |
| --- | --- | --- |
| U10 | Teman menautkan kejadian sama ke laporan lokal. | Tetap satu tiket utama; konfirmasi teman tercatat sekali. |
| U11 | Buat kejadian berbeda pada lokasi/aset yang masih mempunyai tiket aktif. | Diperbolehkan setelah memberi pembeda; kamar tidak dibatasi satu laporan selamanya. |
| U12 | Pendamping mengulang submit yang identik dengan request key sama. | Hasil awal dikembalikan; tiket dan foto tidak bertambah. |
| U13 | Pendamping memakai key sama dengan isi berbeda. | Ditolak sebagai konflik; data awal tidak ditimpa. |
| U14 | Dua proses MySQL membuat kejadian sama bersamaan. | Satu tiket utama; permintaan lain harus menautkan atau menjelaskan kejadian berbeda. |
| U15 | Teknisi 1 dan 2 mengambil tiket yang sama bersamaan. | Tepat satu penanggung jawab dan satu assignment awal. |
| U16 | Penanggung jawab mengulang aksi ambil yang sama. | Tidak menambah assignment atau histori mulai. |

### C. Tim, perintah dan pekerjaan harian

| ID | Pelaku / langkah | Hasil yang wajib terlihat |
| --- | --- | --- |
| U17 | Tambah Teknisi 2 sebagai anggota; Teknisi 3 mencoba akses. | Anggota berhak membaca/progres; teknisi luar tim tidak dapat mengambil alih. |
| U18 | Tambahkan teknisi nonaktif atau anggota yang sama berulang. | Nonaktif ditolak dan tidak ada anggota aktif ganda. |
| U19 | Akhiri anggota lewat pengelolaan tim. | Hak anggota berakhir dan histori tetap. Penggantian penanggung jawab/pembukaan ulang tidak diuji sebagai fitur yang sudah disetujui. |
| U20 | Pimpinan memberi perintah saat teknisi sedang bekerja. | Instruksi tercatat tanpa memotong atau membatalkan pekerjaan berjalan. |
| U21 | Pimpinan mencatat tugas di luar kamar pada gedung sah. | Ada lokasi dan sumber pimpinan, tanpa pelapor penghuni fiktif. |
| U22 | Teknisi menulis progres pekerjaan belum selesai. | Tersimpan pada hari yang benar; bukan bukti final atau selesai semu. |
| U23 | Tandai hambatan, kemudian ambil pekerjaan lain. | Tiket pertama tetap dikerjakan dan hambatannya tercatat; pekerjaan lain boleh ditangani. |
| U24 | Pimpinan memfilter rekap tanggal, gedung dan teknisi. | Progres parsial ikut tampil; bukan hanya tiket selesai pada hari itu. |

### D. Penyelesaian, pembatalan dan pemeriksaan akhir

| ID | Pelaku / langkah | Hasil yang wajib terlihat |
| --- | --- | --- |
| U25 | Penanggung jawab menyelesaikan tanpa catatan atau bukti. | Ditolak dan tidak mengubah status. |
| U26 | Anggota atau teknisi lain mencoba menyelesaikan. | Ditolak; penyelesaian dilakukan penanggung jawab sah. |
| U27 | Selesaikan lalu ulangi permintaan yang identik. | Satu penyelesaian, set bukti, histori dan penutupan assignment. |
| U28 | Akun tanpa hak atau tiket final dicoba dibatalkan. | Ditolak. Pembatalan tiket aktif yang berwenang memerlukan alasan dan histori; tidak membuka ulang tiket final. |
| U29 | Gagal kirim pemberitahuan lalu coba ulang antrean. | Tiket tetap selesai; pemberitahuan yang berhasil tidak diduplikasi. |
| U30 | Bandingkan jumlah dashboard dengan daftar kontrol. | Belum dimulai, dikerjakan, selesai dan batal tepat; hambatan tidak dihitung dua kali. |
| U31 | Superadmin/staf berpermission memberi rating tiket selesai dan belum selesai. | Tiket selesai dapat dinilai sesuai kelayakan; belum selesai ditolak. |
| U32 | GO membuat laporan temuan checkout dua kali atau atas kejadian aktif yang sama. | Finding tetap satu relasi dan tidak menghasilkan tiket utama ganda. |
| U33 | Dua kerusakan pada aset sama diselesaikan lewat proses MySQL terpisah. | Kondisi aset konsisten; kamar maintenance tidak otomatis dibuka untuk alokasi. |
| U34 | Pendamping membandingkan snapshot sebelum/sesudah migration. | Data lama, saldo, penempatan, foto dan histori dipertahankan; tidak mengarang check-in. |
| U35 | Jalankan perjalanan browser per peran dan regresi pendaftaran/checkout. | Alur selesai tanpa kesalahan runtime; bukti browser dipisahkan dari tes HTTP. |

## 5. Catatan hasil dan batas penerimaan

Untuk setiap skenario catat: **ID ___; penguji ___; tanggal ___; akun ___; nomor tiket ___; langkah ___; hasil aktual ___; status ___; bukti/screenshot ___; temuan terkait ___**. Jika gagal, sertakan pesan yang muncul dan apakah transaksi/foto sudah tersimpan. Jangan menghapus histori untuk mengulangi tes.

Pimpinan, fasilitator, teknisi dan perwakilan penghuni meninjau hasil masing-masing. Kelulusan pengujian otomatis bukan tanda tangan UAT client. Peran pengelola lebih rinci, prosedur penggantian penanggung jawab, pembukaan ulang, serta kewajiban foto awal dan rincian jam/material tetap dicatat sebagai keputusan bisnis yang perlu disahkan; tidak ditambahkan sebagai gate baru secara sepihak.

Pemberitahuan yang dicakup panduan ini adalah notifikasi aplikasi. SMTP, SSO kampus dan DPUB nyata tidak disertifikasi oleh UAT pelaporan. Tidak ada WhatsApp yang ditambahkan.

## 6. Referensi dan hasil verifikasi teknis

Acuan rinci: AUDIT_PELAPORAN_KERUSAKAN.md, RENCANA_PENYESUAIAN_PELAPORAN.md dan STATUS_AUDIT_MODUL.md pada folder outputs workspace audit. UAT pendaftaran tetap menggunakan UAT_MODUL_PENDAFTARAN.md.

Hasil teknis terbaru akan diisi setelah pengujian final selesai; jangan membaca hasil 12 tes lifecycle sebelum refaktor sebagai bukti seluruh U01-U35 sudah lulus. Akun/penempatan yang dibuat pada database pengujian terisolasi juga bukan bukti akun dan data yang sama sudah tersedia di server produksi.
