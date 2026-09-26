# Revisi Proses Bisnis Andalas Residence

## 1. Dasar status mahasiswa dan periode

Pisahkan **angkatan**, **kategori mahasiswa**, **status hunian**, dan **penanggung biaya** agar perubahan salah satunya tidak menghapus riwayat lainnya.

- Admin menetapkan tahun angkatan maba pada periode penerimaan, misalnya periode 2026/2027 → angkatan maba 2026. Hanya satu periode penerimaan aktif.
- Angkatan mahasiswa dibaca dari dua digit awal NIM.
- **Binaan:** mahasiswa lokal dengan angkatan sesuai periode aktif, sedang menjalani hunian pertama.
- **Hunian:** mahasiswa lokal angkatan lebih lama atau alumni yang tinggal kembali. Tidak memperoleh fitur absensi dan perizinan binaan.
- **Alumni:** pernah tinggal dan sudah check-out, tanpa hunian aktif. Angkatan lama tidak otomatis berarti alumni.
- **Belum pernah tinggal:** tidak memiliki riwayat hunian di sistem maupun arsip alumni lama.
- Internasional/S2/S3 dan non-mahasiswa menggunakan kategori masing-masing, bukan binaan.

Status tersebut dipakai bersama oleh backend, dashboard, navigasi, pendaftaran, dan layanan surat.

## 2. Manajemen alumni lama dan penerbitan surat

### Pengaturan Admin Layanan

Sediakan dua bagian dalam Manajemen Layanan Bebas Asrama:

- **Tarif historis:** tahun angkatan, gedung, dan nominal. Kombinasi gedung–angkatan harus unik; contoh Oren–2021 Rp2,1 juta dan Hijau–2021 Rp2,4 juta.
- **Arsip alumni ≤2025:** NIM, nama, angkatan, gedung terakhir, serta keterangan arsip bahwa mahasiswa sudah check-out. Tanggal check-out boleh kosong jika arsip tidak memuat tanggal pasti.
- Arsip dapat dimasukkan sebelum mahasiswa mempunyai akun dan dihubungkan berdasarkan NIM ketika akun dibuat. Sediakan input manual serta impor Excel dengan validasi duplikasi dan laporan kesalahan.
- Arsip tidak membuat penempatan kamar aktif dan tidak menggantikan status penghuni yang sedang tinggal kembali.
- Perubahan tarif berlaku untuk tagihan baru; nominal invoice yang sudah terbit tetap mengikuti salinan tarif saat penerbitannya.

### Alur pengajuan

| Kondisi                                                          | Perilaku                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Masih menjadi penghuni aktif                                     | Pengajuan surat ditolak sampai check-out selesai                                                 |
| Alumni lama mengaku sudah lunas                                  | Wajib unggah bukti pembayaran dan rekening koran; Admin Layanan memverifikasi                    |
| Bukti valid                                                      | Catat pelunasan historis yang terkait, nolkan sisa tagihannya, lalu terbitkan surat              |
| Bukti tidak valid                                                | Tolak dengan pesan untuk menemui Admin Layanan di kantor                                         |
| Alumni lama belum lunas                                          | Terbitkan invoice berdasarkan gedung dan angkatan, dikurangi pembayaran yang sudah terverifikasi |
| Mengaku tidak pernah tinggal tetapi ditemukan dalam arsip alumni | Tolak jalur tersebut dan tampilkan tagihan belum lunas tanpa membuat tagihan ganda               |
| Tidak pernah tinggal dan tidak memiliki tagihan                  | Terbitkan Surat Keterangan Tidak Tinggal di Asrama secara otomatis                               |
| Alumni dengan riwayat sistem, termasuk angkatan ≥2026            | Terbitkan surat otomatis setelah check-out selesai dan sisa tagihan pribadi nol                  |

Pengakuan alumni lama yang belum ada dalam arsip masuk pemeriksaan Admin Layanan. Gedung atau tarif yang belum tersedia harus dilengkapi admin, bukan dianggap bernilai nol.

Pelunasan mempertahankan nilai invoice dan riwayat transaksi; angka yang menjadi nol adalah **sisa tagihan**. Bukti pembayaran lama tidak melunasi tagihan lain yang tidak terkait.

### Dokumen dan akses akun

- Pisahkan jenis dokumen: surat bebas asrama untuk mantan penghuni dan surat keterangan tidak tinggal untuk yang tidak pernah tinggal.
- Ikuti contoh PDF root, termasuk varian **Surat Keterangan Telah Membayar Uang Asrama** untuk mantan penghuni pembayar.
- Simpan jenis surat, data pemohon, masa hunian, nominal terkait, nomor, dan versi format saat diterbitkan agar arsip tidak berubah ketika mahasiswa mendaftar kembali.
- Surat tersedia di akun dan dikirim melalui email; kegagalan pembuatan atau pengiriman dapat dicoba ulang tanpa menerbitkan surat ganda.
- Setelah surat terbit, akun menjadi nonaktif untuk layanan penghuni, tetapi tetap dapat login, melihat arsip, dan memulai pendaftaran hunian baru.
- Pengajuan surat berikutnya mengikuti masa hunian baru. Pekerjaan pengiriman surat lama tidak boleh menonaktifkan kembali mahasiswa yang sudah tinggal lagi.

## 3. Pendaftaran, kamar, dan pembayaran

### Kategori dan tarif

- Admin mengelola daftar penerima KIP-K berdasarkan NIM dan angkatan. Kategori ini ditentukan sistem dari daftar admin, bukan pilihan bebas pendaftar.
- Alumni lokal yang mendaftar kembali menjadi **lokal non-KIP-K**.
- Internasional/S2/S3 memiliki pilihan pembayar pribadi atau penanggung biaya yang disahkan Admin Layanan.
- Admin mengatur kategori penghuni yang diperbolehkan pada tiap gedung, tipe Standar/Medium/Premium, dan tarif tiap gedung–tipe.
- Dukung tarif per periode dan per hari. Tarif harian menggunakan tanggal masuk sampai tanggal keluar, minimum satu hari; invoice menampilkan durasi dan satuan.
- Pertahankan pemeriksaan jenis kelamin, kapasitas, dan kondisi kamar.

### Pendaftaran otomatis

- Selain KIP-K, mahasiswa memilih tipe serta nomor kamar. KIP-K melewati pemilihan kamar dan ditempatkan Admin Layanan.
- Pilihan kamar membuat reservasi kapasitas dan invoice dalam satu transaksi.
- Reservasi berlaku **24 jam**, dapat diatur admin. Setelah kedaluwarsa, kapasitas dilepas jika tidak ada pembayaran atau bukti yang sedang diperiksa.
- Bukti pembayaran yang menunggu verifikasi menahan reservasi sampai diputuskan admin.
- Pendaftaran selesai otomatis setelah pelunasan atau cicilan pertama yang ditetapkan admin. Tidak ada persetujuan pendaftaran tambahan bagi pembayar pribadi.
- Pendaftar yang ditanggung selesai setelah penanggung biaya disahkan dan kamar tersedia; tidak perlu menunggu sponsor membayar.
- Akun alumni dapat memulai alur ini secara mandiri. Layanan penghuni aktif kembali hanya setelah pendaftaran selesai.
- Kwitansi mencantumkan nominal yang benar-benar dibayar, kamar, tipe, gedung, dan durasi. Pendaftaran tanpa pembayaran pribadi tidak menghasilkan kwitansi pembayaran fiktif.

### Cicilan, VA, dan sponsor

- Hilangkan pengajuan cicilan oleh mahasiswa dari sistem. Admin mengatur nominal pembayaran berikutnya berdasarkan kesepakatan di luar sistem.
- Pisahkan total biaya, jumlah sudah dibayar, sisa utang, dan nominal yang harus dibayar sekarang.
- Karena belum ada API bank, admin memasukkan nomor VA dan memverifikasi pembayaran. Sinkronisasi nominal ke bank dan konfirmasi pembayaran otomatis berada di tahap integrasi berikutnya.
- Tagihan pribadi KIP-K atau penerima pembiayaan bernilai nol, tetapi biaya yang ditanggung tetap tercatat sebagai piutang penanggung biaya.
- Piutang sponsor tidak menghalangi check-out atau surat mahasiswa. Pembayaran sponsor tidak tercatat sebagai pembayaran pribadi mahasiswa.

## 4. Invoice gabungan dan layanan operasional

### Invoice admin

- Tampilkan seluruh invoice dengan pencarian, filter kategori/pembayar/status, serta pengurutan nominal dan tanggal.
- Perbarui saldo setelah transaksi; gunakan penyegaran berkala lima detik pada halaman yang terbuka.
- Admin memilih tagihan milik beberapa klien untuk dibuatkan invoice gabungan.
- Form ekspor memuat nomor invoice, tanggal otomatis, penerima, instansi, perihal, bank, rekening, atas nama, batas pembayaran, dan identitas penandatangan.
- Ikuti contoh `INVOICE Pasca Sarjana.pdf`: rincian nama penghuni, gedung, durasi, tarif, jumlah, total, serta area tanda tangan.
- Invoice gabungan merujuk tagihan asal tanpa menggandakan piutang. Pembayaran gabungan dialokasikan admin ke tagihan asal dan memperbarui saldo masing-masing.
- PDF yang sudah diterbitkan disimpan sebagai arsip tetap; daftar saldo menampilkan keadaan terbaru.

### Check-out, kerusakan, izin, dan aset

- Check-out menampilkan syarat, dilanjutkan pemeriksaan GO, lalu penyelesaian oleh fasilitator gedung.
- Tambahkan pemeriksaan sisa tagihan pribadi nol sebelum fasilitator menyelesaikan check-out.
- Perbarui kapasitas kamar berdasarkan penghuni yang tersisa. Kamar dalam pemeliharaan tetap tidak tersedia.
- Temuan inspeksi memperbarui kondisi aset dan dapat diteruskan menjadi laporan kerusakan.
- Pelaporan kerusakan hanya untuk penghuni aktif; teknisi mengunggah foto dan deskripsi penyelesaian; pimpinan melihat laporan dan progresnya.
- Absensi dan perizinan mengikuti kategori binaan yang sama, termasuk pemeriksaan pada endpoint.
- Pertahankan aturan literal izin: lebih dari enam pengajuan sebelumnya memerlukan verifikasi fasilitator; pengajuan kedelapan mulai memerlukan verifikasi.
- Bukti sampai dan kembali menggunakan unggahan foto, waktu server, dan lokasi perangkat. Tidak menambahkan pengenalan isi foto otomatis.
- Pertahankan pengelolaan stok oleh Admin Aset serta pendataan dan impor aset kamar oleh fasilitator sesuai gedung penugasannya.

## 5. Perubahan teknis, migrasi, dan pengujian

- Tambahkan data tahun maba pada periode, arsip alumni lama, tarif historis per gedung, daftar KIP-K, tarif hunian, reservasi, penanggung biaya, serta invoice gabungan.
- Perluas kontrak pendaftaran dengan masa hunian dan sumber pembayaran; perluas pengajuan surat dengan jenis dokumen dan referensi masa hunian.
- Gunakan routes Laravel/Wayfinder dan props Inertia mengikuti struktur yang ada. Pertahankan desain aplikasi dengan formulir dan tabel sesuai pekerjaan tiap peran.
- Migrasi bersifat tambahan dan mempertahankan perubahan lokal, pembayaran, serta surat lama. Tarif lama tanpa gedung ditandai perlu dilengkapi; jangan menebak gedung atau menyalinnya ke semua gedung.
- Bedakan akun nonaktif akibat surat dengan akun yang diblokir admin agar pendaftaran mandiri tidak melewati pemblokiran administratif.

Uji dengan Pest dan pengujian React yang tersedia:

- Matriks angkatan, kategori, periode aktif, alumni lama, penghuni aktif, dan pendaftaran ulang.
- Dua jenis surat, bukti ditolak/disetujui, tarif hilang, pembayaran sebagian, arsip alumni cocok/tidak cocok, dan penerbitan berulang.
- Perebutan kapasitas kamar, kedaluwarsa reservasi, pembayaran menunggu verifikasi, cicilan, dan tarif harian/periode.
- Pemisahan utang mahasiswa–sponsor serta alokasi pembayaran invoice gabungan.
- Check-out dengan utang, inspeksi belum lengkap, pembatasan gedung, izin pada batas enam/tujuh pengajuan sebelumnya, dan impor aset.
- Surat lama tetap dapat diunduh setelah daftar ulang; pengiriman ulang tidak mengubah status hunian baru.

Urutan implementasi: fondasi status dan periode → alumni historis dan surat → pendaftaran serta penagihan → invoice gabungan → penyesuaian layanan operasional. Jalankan tes terdampak, pemeriksaan PHPStan/TypeScript, dan formatter sesuai proyek sebelum meninjau hasil akhir.
