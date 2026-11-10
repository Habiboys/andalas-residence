# UAT Modul Pendaftaran Andalas Residence

Acuan: BPMN To-Be, sheet Validasi client, dan rancangan penyesuaian pendaftaran. Tanggal: 10 November 2026.

## 1. Siapkan akun

Semua akun di bawah memakai **password: `password`**, melalui **login akun biasa**. Tidak perlu setting .env tambahan. Seed ulang mereset password khusus akun `uat.*`; transaksi dan akun lain tidak direset.

```bash
docker compose exec -T andalas-app php artisan db:seed --class=ResidenceRegistrationUatSeeder --force --no-interaction
```

Untuk database baru, DatabaseSeeder sudah memanggil seeder ini setelah role, master, dan periode disiapkan. Role aplikasi, periode aktif dan satu gedung perempuan harus tersedia sebelum menjalankan seeder secara terpisah.

| Akun | Peran / kegunaan |
| --- | --- |
| uat.superadmin@example.test | Superadmin: konfigurasi dan pengecekan akun |
| uat.pengelola@example.test | Pengelola: dokumen, penempatan, kontrak, institusi/kegiatan |
| uat.keuangan@example.test | Rekonsiliasi DPUB dan invoice; memakai role admin_layanan, belum merupakan role keuangan terpisah |
| uat.pimpinan@example.test | ACC/tolak cicilan dan penundaan |
| uat.fasilitator@example.test | Check-in, mutasi dan serah kunci sesuai gedung penugasan |
| uat.inspeksi@example.test | GO: inspeksi kamar |
| uat.lokal@example.test | Lokal S1 non-KIP-K, pendaftaran baru |
| uat.kipk@example.test | S1 KIP-K, tercatat dalam roster penerima uji |
| uat.teman@example.test | S1 non-KIP-K untuk menerima undangan teman sekamar |
| uat.bulanan@example.test | S1 non-maba untuk skema bulanan |
| uat.s2@example.test | S2 mandiri, profil jenjang S2 |
| uat.s3@example.test | S3 mandiri, profil jenjang S3 |
| uat.internasional@example.test | Mahasiswa internasional |

Mahasiswa uji berjenis kelamin perempuan. Fasilitator mengikuti gedung perempuan yang dipilih saat seed; lihat nama gedung pada keluaran perintah, jangan selalu menganggap RPX (A). S2/S3, teman dan internasional adalah akun berbeda dengan profil masing-masing.

**Batas siap uji:** akun baru siap login dan belum mempunyai pendaftaran. Uji transaksi memerlukan periode aktif yang tanggal/angkatannya benar, kebijakan kategori sudah diterbitkan, tarif, dokumen dan kamar layak tersedia. Seeder tidak mengarang persetujuan, tarif atau pembayaran. Akun yang sudah pernah digunakan melanjutkan kondisi terakhir; seed ulang bukan reset skenario. Akun uji belum otomatis ada di produksi sampai seed dijalankan di server tersebut.

## 2. Persiapan oleh superadmin/pengelola

1. Masuk sebagai superadmin/pengelola. Pastikan periode aktif masih berlaku dan angkatan maba terisi sesuai peserta uji. Khusus KIP-K, angkatan profil, roster, dan periode harus cocok.
2. Terbitkan kebijakan tiap kategori: gedung, dokumen wajib, tarif per satuan, tarif satu kamar bersama, dan prioritas gedung/lantai KIP-K. Aktifkan bulanan untuk non-maba bila hendak diuji.
3. Siapkan kamar kosong dengan minimal dua tempat untuk uji teman, kamar lain untuk mutasi, satu kamar penuh dan satu maintenance. Cocokkan gender dan penugasan fasilitator.
4. Siapkan dokumen uji identitas/perjanjian/surat institusi serta catatan DPUB uji. Jangan menggunakan penerimaan fiktif sebagai transaksi operasional nyata.

## 3. Skenario per tahap

Lakukan satu jalur sampai selesai sebelum berpindah ke jalur lain. Untuk cabang yang saling eksklusif (misalnya bayar penuh versus penundaan), gunakan peserta uji lain atau ulang pada database uji yang sudah direset secara terencana.

| Tahap | Akun | Tindakan | Hasil yang harus terlihat |
| --- | --- | --- | --- |
| 1 Lokal | uat.lokal | Ajukan hunian dan pilih kamar yang layak | Alokasi dan invoice tercatat; belum menjadi penghuni fisik |
| 2 Dokumen | uat.lokal → uat.pengelola | Unggah dokumen; minta revisi dengan alasan; unggah ulang dan validasi | Versi serta pemeriksa tercatat; berkas belum valid menghalangi check-in |
| 3 Bayar penuh | uat.keuangan | Catat sumber resmi DPUB, cocokkan ke invoice, ulangi konfirmasi | Saldo dibukukan sekali; pembayaran membuat siap check-in tanpa otomatis menyerahkan kunci |
| 4 Check-in | uat.fasilitator | Periksa identitas, berkas asli dan serahkan kunci; ulangi aksi | Satu penempatan aktif; pendaftaran selesai pada serah kunci; klasifikasi dan notifikasi tercatat |
| 5 KIP-K | uat.kipk → pengelola/fasilitator | Ajukan tanpa memilih kamar/teman; validasi berkas dan check-in sebelum cair | Sistem memilih menurut prioritas; kewajiban tetap ada; jika penuh masuk antrean tanpa tagihan/alokasi ganda |
| 6 Pencairan KIP-K | uat.pengelola → uat.keuangan | Catat pencairan dan jatuh tempo, kemudian rekonsiliasi pembayaran | Piutang berkurang hanya setelah pembayaran resmi |
| 7 Teman sekamar | uat.lokal → uat.teman → uat.pengelola | Mulai dengan tarif satu kamar; kirim undangan; teman menerima; pengelola sahkan seluruh anggota | Dua anggota satu kontrak; total pembagian tepat tarif kamar. Jalankan sebelum uat.lokal membuat kontrak per orang pada jalur 1 |
| 8 Cicilan | Peserta yang belum check-in → uat.pimpinan → uat.pengelola | Ajukan; pimpinan ACC; pengelola tetapkan termin; unggah dan validasi perjanjian keputusan; bayar uang awal | ACC saja belum cukup; setelah syarat lengkap siap check-in, sisa utang tetap tercatat |
| 9 Tolak/penundaan | Peserta belum check-in → uat.pimpinan | Tolak permohonan atau ACC penundaan tanpa uang awal, lalu lengkapi skema/perjanjian | Penolakan tidak memberi izin; penundaan sah tidak menghapus utang |
| 10 Bulanan | uat.bulanan → uat.pengelola → keuangan | Ajukan skema bulan, sahkan kelayakan dan jadwal, bayar bulan awal | Non-maba dapat disetujui; maba yang memanipulasi satuan bulan ditolak |
| 11 S2/S3 | uat.pengelola, data uat.s2 dan uat.s3 | Pilih S2/S3 mandiri, isi identitas/prodi sesuai akun, tempatkan tanpa surat IO | Akun lama dipakai; tidak wajib institusi/surat IO; pembayaran pribadi dan check-in tetap mengikuti syarat |
| 12 Internasional | uat.pengelola, data uat.internasional | Catat permohonan institusi dan surat, tentukan sponsor/batas tanggungan serta kamar | Kewajiban sponsor dan upgrade pribadi terpisah; persetujuan tinggal tidak menyatakan sponsor sudah lunas |
| 13 Summer Course | uat.pengelola → keuangan → fasilitator | Satu kegiatan, surat, penyelenggara dan beberapa peserta; check-in bertahap; final invoice akhir sewa; kunci per peserta | Peserta, kamar dan invoice terhubung; pembayaran kelompok dibukukan sekali. Peserta dicatat pengelola, tidak perlu akun mahasiswa baru |
| 14 Umum | uat.pengelola → pimpinan/keuangan → fasilitator | Input pemohon umum; unggah bukti transfer dan sahkan izin, atau ajukan penundaan tanpa pembayaran | Bukti transfer belum berarti dana cocok; tanpa pembayaran perlu ACC; alokasi umum melalui pengelola |
| 15 Perubahan | uat.pengelola/fasilitator | Revisi anggota dengan persetujuan; mutasi kamar dan periksa selisih | Pembayaran lama terpelihara, total dan kredit terlihat, kapasitas/penugasan diperiksa; perubahan cicilan mengikuti persetujuan baru |
| 16 Akhir tinggal | uat.inspeksi → uat.fasilitator | Ajukan inspeksi, periksa kondisi, terima kunci dan konfirmasi kosong | Akhir tanggal saja tidak melepas kamar; kamar rusak tetap maintenance |
| 17 Rekap | uat.pimpinan / uat.keuangan | Cocokkan dashboard dengan registrasi, invoice dan bukti | Pendaftar, alokasi, siap check-in, penghuni fisik, piutang dan kredit berbeda dan konsisten |

## 4. Pemeriksaan penolakan dan integrasi

- Coba check-in sebelum dokumen valid, uang awal terpenuhi, atau persetujuan lengkap: harus ditolak.
- Coba akun mahasiswa mengakses dokumen milik orang lain; fasilitator gedung lain memproses penghuni; dua pendaftar mengambil tempat terakhir: tidak boleh menembus otorisasi/kapasitas.
- Ulangi check-in, mutasi dan rekonsiliasi: tidak boleh menggandakan penempatan, pembayaran atau histori.
- Ubah versi kebijakan: kontrak berjalan tetap memakai versi yang disimpan.
- SSO diuji dengan akun kampus sah. Email @example.test hanya untuk login; pengiriman email nyata perlu alamat penerima uji yang dikuasai. Data resmi DPUB dan email/SSO nyata diuji terpisah.

## 5. Catat hasil

| Tahap | Penguji / tanggal | ID registrasi/invoice | Bukti dan hasil aktual | Lulus / gagal / belum diuji |
| --- | --- | --- | --- | --- |
| Isi nomor tahap | | | | |

Daftar langkah ini adalah panduan UAT, bukan pernyataan seluruh alur sudah lulus. Catat kendala konfigurasi atau implementasi sebagai temuan, jangan dianggap otomatis lulus.
