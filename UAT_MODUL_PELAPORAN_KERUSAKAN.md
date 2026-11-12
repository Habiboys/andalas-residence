# UAT Modul Pelaporan dan Kerusakan Andalas Residence

Tanggal: **11 November 2026**. Acuan: Business Rules/Functional Requirements Revisi Final, Validasi, BPMN To-Be dan keputusan pengguna mengenai logbook.

Status: kode revisi tersedia; hasil pengujian teknis dicatat pada bagian akhir. **Tabel skenario adalah panduan UAT, bukan pernyataan seluruh skenario telah diterima client.**

## 1. Rekap akun

Gunakan **login akun biasa**, dengan **password: `password`** untuk akun UAT. Akun berasal dari **ResidenceRegistrationUatSeeder yang sudah ada**, tanpa seeder terpisah dan tanpa tambahan pengaturan .env. Akun yang sudah pernah dipakai melanjutkan kondisi terakhir; seed ulang tidak menghapus transaksi atau mengembalikan skenario ke awal.

| Email login | Peran | Dipakai untuk |
| --- | --- | --- |
| uat.superadmin@unand.ac.id | Superadmin | Persiapan, akun, penugasan gedung, pemeriksaan dan penilaian teknisi. |
| uat.pengelola@unand.ac.id | Admin layanan | Persiapan hunian dan pendampingan administrasi; bukan teknisi penyelesai tiket. |
| uat.pimpinan@unand.ac.id | Pimpinan | Perintah pekerjaan, monitoring dan aktivitas harian. |
| uat.fasilitator@unand.ac.id | Fasilitator A | Melihat laporan dan foto pada gedung penugasannya. |
| uat.fasilitator2@unand.ac.id | Fasilitator B | Uji penolakan akses gedung A. Periksa penugasan aktual. |
| uat.aset@unand.ac.id | Admin aset | Inventaris dan pengaitan aset yang belum tercatat. |
| uat.inspeksi@unand.ac.id | Petugas GO | Temuan checkout dan kaitannya dengan tiket kerusakan. |
| uat.teknisi@unand.ac.id | Teknisi 1 | Penanggung jawab: mengambil, mengatur anggota, progres dan menyelesaikan. |
| uat.teknisi2@unand.ac.id | Teknisi 2 | Anggota tim atau pesaing klaim, sesuai skenario. |
| uat.teknisi3@unand.ac.id | Teknisi 3 | Teknisi di luar tim; uji akses yang harus ditolak. |
| uat.lokal@student.unand.ac.id | Mahasiswa S1 | Pelapor utama setelah check-in. |
| uat.teman@student.unand.ac.id | Mahasiswa S1 | Teman sekamar pelapor utama setelah check-in pada kamar yang sama. |
| uat.kipk@student.unand.ac.id | Mahasiswa KIP-K | Ulangi alur pelaporan setelah alokasi dan check-in yang sah. |
| uat.s2@student.unand.ac.id | Mahasiswa S2 | Variasi penghuni S2 atau penghuni kamar lain. |
| uat.s3@student.unand.ac.id | Mahasiswa S3 | Variasi S3 atau penghuni gedung lain. |
| uat.internasional@student.unand.ac.id | Internasional | Variasi penghuni internasional setelah check-in. |
| uat.bulanan@student.unand.ac.id | Mahasiswa non-maba | Variasi penghuni dengan skema bulanan setelah check-in. |
| uat.keuangan@unand.ac.id | Admin layanan | Tetap tersedia untuk UAT pendaftaran/keuangan; bukan aktor wajib perbaikan. |

Seeder sekarang mencakup **18 akun**. Lima tambahan pelaporan adalah teknisi, teknisi2, teknisi3, aset dan fasilitator2. Password UAT direset menjadi password saat seed ulang; role, penugasan dan transaksi akun yang sudah ada dipertahankan. Fasilitator kedua hanya diberi penugasan otomatis bila tersedia gedung lain; bila belum ada, tetapkan melalui menu master penugasan sebelum uji lintas gedung.

Perintah setelah kode terbaru dan migration tersedia: `docker compose exec -T andalas-app php artisan db:seed --class=ResidenceRegistrationUatSeeder --force --no-interaction`. Ini menyiapkan akun, bukan menjalankan UAT. Jangan menganggap akun sudah ada di produksi sebelum perintah dijalankan di server tersebut.

## 2. Persiapan data dan cara masuk

1. Gunakan lingkungan uji. Jalankan migration kompatibel sebelum seed; tidak perlu migrate fresh. Catat versi kode, tanggal dan nama penguji.
2. Gunakan login akun biasa. Akun mahasiswa baru masih calon: selesaikan alokasi, dokumen, dan check-in lewat UAT pendaftaran. Status aktif dan penempatan aktif wajib tersedia sebelum melapor; pembayaran saja tidak cukup.
3. Tempatkan lokal dan teman pada kamar yang sama. Siapkan S2 di kamar lain serta S3 di gedung lain; satu calon yang belum check-in dipertahankan untuk uji penolakan.
4. Tetapkan fasilitator A ke gedung pelapor dan fasilitator B ke gedung pembanding. Jangan menganggap nama akun sama dengan kode gedung tertentu; lihat penugasan aktual.
5. Siapkan AC, pintu dan lampu sebagai contoh item berbeda, satu fasilitas bersama serta lokasi tanpa inventaris. Foto awal item opsional. Bukti final laporan dan foto logbook wajib pada implementasi ini: JPG/PNG, maksimal lima foto masing-masing 5 MB.
6. Buka menu Pelaporan dan pekerjaan teknisi atau `/pelaporan`. Gunakan sesi browser terpisah per akun. Pastikan queue worker dan scheduler hidup untuk pemberitahuan aplikasi.

Catat: gedung ___; kamar ___; fasilitator A/B ___; penguji ___; tanggal ___; versi kode ___; ID laporan ___; item ___; ID logbook ___. Database/browser fixture terisolasi tidak menjadi bukti akun dan hunian sudah disiapkan di produksi.

## 3. Alur utama secara berurutan

| Tahap | Akun / tindakan | Hasil yang diharapkan |
| --- | --- | --- |
| 1 | Lokal: buka formulir, masukkan AC rusak dan pintu macet sebagai dua item. Foto masing-masing dapat ditambahkan. | Identitas kamar otomatis; satu nomor laporan dan dua item/deskripsi terpisah. |
| 2 | Teman: sebelum laporan diambil, tambahkan lampu rusak dari kamar yang sama. | Tetap nomor laporan yang sama, kini tiga item. Pelapor/waktu setiap item tercatat. |
| 3 | Teknisi 1: ambil laporan. Fasilitator A dan pimpinan memantau. | Teknisi 1 menjadi penanggung jawab; status Sedang Dikerjakan. Membuka detail saja tidak mengubah status. |
| 4 | Teknisi 1: tambahkan Teknisi 2 sebagai anggota dan isi alasan. Teknisi 2 mencatat progres serta hambatan. | Tim/progres tercatat; status tetap dikerjakan. Teknisi 3 di luar tim tidak dapat mengambil alih. |
| 5 | Teknisi 1: tandai AC dan pintu selesai, sisakan lampu; coba selesaikan seluruh laporan dengan bukti. | Final ditolak karena lampu belum selesai. Tidak ada notifikasi selesai atau perubahan final parsial. |
| 6 | Teknisi 1: tandai lampu selesai, isi hasil akhir, pilih partisipan dan unggah bukti final. | Semua item selesai; laporan final sekali; partisipan dan bukti tersimpan atomik. |
| 7 | Lokal/teman: buka hasil dan pemberitahuan. Pimpinan: buka rekap tanggal itu. | Bukti privat tampil sesuai hak; aktivitas selesai tercatat walau tidak ada progres manual hari itu. |
| 8 | Lokal: ajukan komplain ulang dengan alasan dan item/laporan yang kembali bermasalah. | Komplain tercatat terkait laporan lama; histori selesai tidak ditimpa dan tidak otomatis dibuka ulang. |
| 9 | Teknisi 2: catat pekerjaan lain/perintah pimpinan sebagai logbook berisi tanggal, uraian dan foto. | Masuk rekap harian pimpinan, tanpa membuat tiket, klaim atau status kerusakan baru. |
| 10 | Fasilitator B/penghuni kamar lain: coba buka detail dan URL foto. | Akses di luar cakupan ditolak server. Logbook hanya dapat dibaca teknisi pemilik, pimpinan atau superadmin. |

Ulangi alur pelapor dengan KIP-K, S2, S3, internasional dan bulanan yang sudah check-in. Kategori tidak menghapus hak penghuni sah. Ketika laporan sudah dikerjakan, pengiriman item baru pada implementasi ini membuat laporan belum dikerjakan yang terpisah; laporan lama tidak diubah. Ini pilihan operasional sementara yang perlu dicocokkan pada keputusan client berikutnya.

## 4. Daftar pemeriksaan U01-U35

ID lama dipertahankan tetapi makna pengelompokan diperbarui sesuai Revisi Final. Isi setiap hasil dengan Lulus/Gagal/Belum diuji/Terhambat dan bukti. Permintaan bersamaan, request key dan snapshot migration dibantu pengembang.

| ID | Langkah pemeriksaan | Hasil wajib |
| --- | --- | --- |
| U01 | Penghuni aktif melapor kerusakan. | Data, lokasi, item dan histori tercatat; langsung ke teknisi. |
| U02 | Calon tanpa check-in mencoba melapor. | Ditolak tanpa tiket/file sisa. |
| U03 | Manipulasi aset/kamar pada request. | Server menolak aset di luar hunian/fasilitas yang berhak. |
| U04 | Laporkan fasilitas bersama. | Lokasi sesuai fasilitas, bukan dipalsukan sebagai kamar pribadi. |
| U05 | Laporkan item tanpa inventaris. | Dapat disimpan dengan uraian/lokasi sah. |
| U06 | Fasilitator B melihat/memutasi tiket A. | Daftar/detail/foto/tindakan di luar gedung ditolak. |
| U07 | Teman aktif sekamar melihat detail. | Item, foto awal/hasil dan histori yang berhak terlihat. |
| U08 | Mantan teman atau penghuni baru melihat arsip sebelum masa huniannya. | Akses berbasis kamar dibatasi; hak pelapor sendiri tetap terpisah. |
| U09 | URL foto dibuka akun lain/tanpa login. | Tidak membuka file privat. |
| U10 | Teman menambahkan kerusakan sebelum pekerjaan dimulai. | Item ditambahkan pada header kamar yang sama; konfirmasi bukan pengganti item. |
| U11 | AC dan pintu berbeda dilaporkan pada kamar sama sebelum mulai. | Tetap satu header Belum Dikerjakan dengan dua item. |
| U12 | Ulang submit dengan key sama. | Tidak menambah item/foto dua kali. |
| U13 | Key sama dengan isi berbeda. | Konflik ditolak; data awal tidak ditimpa. |
| U14 | Dua penghuni menambah item bersamaan. | Satu header belum dikerjakan; item keduanya tersimpan. |
| U15 | Dua teknisi mengambil laporan bersamaan. | Tepat satu penanggung jawab. |
| U16 | Pemilik mengulang klaim identik. | Tidak menambah assignment/histori mulai. |
| U17 | Tambah anggota dan coba akses teknisi di luar tim. | Anggota boleh progres; orang di luar tim tidak mengambil alih. |
| U18 | Tambah anggota nonaktif/duplikat. | Nonaktif ditolak; tidak ada assignment aktif ganda. |
| U19 | Akhiri anggota. | Hak aktif berakhir, histori bertahan. Penggantian ketua bukan fitur yang diputuskan di sini. |
| U20 | Ada instruksi pimpinan ketika teknisi sedang bekerja. | Tidak otomatis memotong pekerjaan; pekerjaan lain dicatat lewat logbook. |
| U21 | Teknisi mencatat tugas di luar kamar. | Logbook mandiri tanpa pelapor penghuni fiktif atau tiket wajib. |
| U22 | Catat progres belum selesai. | Masuk rekap pada tanggal tepat; bukan selesai semu. |
| U23 | Catat hambatan lalu kerjakan laporan lain. | Tiket awal tetap dikerjakan dengan histori hambatan. |
| U24 | Pimpinan memfilter tanggal/teknisi. | Progres, penyelesaian dan logbook dapat ditelusuri; jenis catatan dibedakan. |
| U25 | Coba final tanpa catatan/bukti. | Ditolak tanpa transisi final. |
| U26 | Anggota/teknisi lain mencoba menyelesaikan. | Ditolak; hanya penanggung jawab sah. |
| U27 | Ulang penyelesaian yang sama. | Satu hasil final, histori, bukti dan pemberitahuan. |
| U28 | Batalkan tanpa hak atau setelah selesai. | Ditolak. Pembatalan aktif berwenang beralasan dan tercatat. |
| U29 | Pengiriman notifikasi gagal lalu retry. | Tiket tetap selesai; informasi aplikasi tidak digandakan. |
| U30 | Cocokkan dashboard dan dataset kontrol. | Header, item dan logbook tidak dicampur; hambatan tidak dihitung ganda. |
| U31 | Beri rating pada tiket selesai/belum selesai. | Guard enum benar dan otorisasi tetap berlaku. |
| U32 | Buat temuan checkout berulang. | Satu relasi finding, histori tidak hilang dan item terhubung benar. |
| U33 | Selesaikan dua pekerjaan aset sama lewat proses terpisah. | Kondisi aset konsisten; kamar maintenance tidak otomatis dialokasikan. |
| U34 | Migration pada snapshot lama. | Saldo, hunian, ID/status/bukti/histori lama utuh; satu item legacy ditambahkan. |
| U35 | Jalankan perjalanan browser per peran. | Alur bisnis selesai; hasil browser dibedakan dari feature test HTTP. |

## 5. Tambahan U36-U50 dari audit Revisi Final

| ID | Langkah pemeriksaan | Hasil wajib |
| --- | --- | --- |
| U36 | Kirim beberapa kerusakan sekaligus. | Satu header, deskripsi tiap item terpisah. |
| U37 | Teman menambahkan item pada header Belum Dikerjakan. | Nomor header tetap; pelapor/waktu item tercatat. |
| U38 | Penambahan bersamaan dari dua penghuni. | Tidak membuat dua header kamar belum dikerjakan. |
| U39 | Retry tambah item dengan key sama. | Item/foto tidak ganda; perubahan isi dengan key sama ditolak. |
| U40 | Tambah item dan klaim bersamaan. | Lock kamar menentukan hasil atomik; tidak menyisipkan item diam-diam ke pekerjaan berjalan. |
| U41 | Buka foto item AC dan pintu. | Foto tidak tertukar, akses privat. |
| U42 | Dua dari tiga item selesai lalu final. | Ditolak, status dikerjakan dan tidak ada informasi final. |
| U43 | Semua item selesai, final lengkap. | Final sekali beserta partisipan/histori/bukti. |
| U44 | Catat perintah pimpinan sebagai logbook. | Tanggal, uraian dan foto; tidak membuat tiket. |
| U45 | Logbook tanpa foto/uraian/tanggal atau pelaku tidak berhak. | Ditolak, tidak meninggalkan data/file parsial. |
| U46 | Selesaikan tanpa progres manual hari itu. | Aktivitas penyelesaian tetap terlihat pada rekap. |
| U47 | Komplain ulang hasil selesai. | Alasan dan referensi item/laporan tersimpan; status lama tetap. |
| U48 | Sertakan partisipan saat final lalu buat salah satu syarat gagal. | Tidak meninggalkan perubahan tim/selesai parsial. |
| U49 | Akses foto logbook/item atau komplain dengan akun di luar hak. | Server menolak. Pemilik/pimpinan mendapat akses logbook sesuai aturan. |
| U50 | Bandingkan snapshot sebelum/sesudah migration. | Data lama utuh; item legacy jelas; jumlah logbook tidak menambah tiket. |

## 6. Pencatatan hasil dan keputusan yang terbuka

Untuk setiap uji isi: ID ___; akun ___; penguji ___; tanggal ___; nomor header/item/logbook ___; hasil aktual ___; status ___; bukti ___; temuan ___. Simpan screenshot untuk kasus gagal dan jangan hapus histori untuk merapikan hasil.

Keputusan operasional yang belum final: penanganan tambahan setelah pekerjaan dimulai, kewajiban foto per item (saat ini foto awal opsional dan bukti final header wajib), penggantian penanggung jawab, tindak lanjut komplain setelah diajukan, koreksi logbook dan akses historis tim. Komplain tidak otomatis membuka ulang; logbook bersifat pencatatan pekerjaan, bukan workflow persetujuan. Tidak ada email/WhatsApp yang ditambahkan untuk penyelesaian kerusakan.

## 7. Verifikasi teknis

Hasil pengujian terarah, MySQL, TypeScript, PHPStan, build dan browser dicatat pada laporan verifikasi implementasi. Kelulusan teknis bukan pengesahan UAT client. Akun/fixture dalam database terisolasi tidak membuktikan data yang sama tersedia di produksi. Pengujian SSO kampus, SMTP dan DPUB nyata tetap di luar pernyataan kelulusan modul pelaporan.
