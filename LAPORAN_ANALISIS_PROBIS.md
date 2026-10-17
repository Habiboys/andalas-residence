# Laporan analisis kesesuaian proses bisnis Andalas Residence

Tanggal analisis: 17 Oktober 2026  
Dasar aplikasi: kode lokal pada commit `fcc61fe`  
Dokumen acuan: `C:\Users\HP\Documents\Business Discovery.xlsx`

## 1. Kesimpulan untuk pengelola

**Web sudah membantu operasional dan arahnya sesuai dengan kebutuhan utama. Namun, belum seluruh tujuan bisnis terpenuhi secara utuh.** Pendaftaran, pemilihan kamar, reservasi, pembayaran, pelaporan kerusakan, inspeksi check-out, dan penerbitan surat sudah mempunyai alur yang saling terhubung. Pengembangan berikutnya sebaiknya memusatkan perhatian pada ketepatan aturan dan hubungan antarproses.

Bagian yang paling perlu disesuaikan:

1. Batas izin dalam dokumen adalah **6 hari**, sedangkan implementasi memakai **jumlah pengajuan sebelumnya** sebagai dasar persetujuan otomatis.
2. Izin dan sakit belum menjadi status kehadiran yang terhubung otomatis pada alur absensi yang ditinjau.
3. Temuan aset rusak saat check-out menghasilkan tiket, tetapi belum otomatis memastikan kamar tidak ditawarkan kembali sebelum dinyatakan siap.
4. Penghuni impor yang sudah dikonfirmasi membayar berpotensi tetap mendapat label **Belum bayar**, karena tampilan membaca transaksi pembayaran, bukan catatan pembayaran impor.
5. Pembayaran terverifikasi saat ini dapat langsung mengaktifkan hunian. Proses pemeriksaan berkas dan kedatangan fisik perlu dipisahkan bila check-in memang memerlukan kedua pemeriksaan tersebut.
6. Rekap iqab/reward, perpindahan kamar, dan indikator kinerja menyeluruh pimpinan belum terlihat lengkap pada alur yang ditinjau.

Tidak ada persentase kesesuaian yang dipaksakan dalam laporan ini. Jumlah menu atau tes yang lolos tidak membuktikan bahwa tujuan bisnis telah tercapai. Misalnya, pengurangan pertanyaan pendaftar harus diukur dari penggunaan nyata.

## 2. Dasar dan batas penilaian

Empat sheet dokumen telah dibaca: **Stakeholder Register**, **Business Problem Register**, **Business Objective**, dan **Scope**. Dokumen memuat 6 kelompok stakeholder ber-ID, 6 kelompok masalah bisnis, 11 tujuan bisnis, serta 18 cakupan proses.

Penilaian membandingkan kebutuhan tersebut dengan controller, action, model, halaman terkait, pembagian permission, scheduler, data impor, dan tes aplikasi. Graph digunakan untuk menemukan bagian kode, lalu sumber aktual diperiksa karena metadata indeks menandai sejumlah berkas berubah. Penelusuran ini berfokus pada proses yang disebut dokumen, bukan audit menyeluruh semua keamanan dan infrastruktur aplikasi.

Status penilaian:

- **Dukungan kuat:** mekanisme inti tersedia dan relevan dengan tujuan. Manfaat operasional tetap perlu diukur.
- **Parsial:** sebagian proses tersedia, tetapi ada hubungan, aturan, data, atau keluaran penting yang belum lengkap.
- **Perlu keputusan:** dokumen sendiri belum menetapkan cakupan atau aturan final.

Audit dilakukan terhadap **kode lokal**, bukan pengamatan langsung seluruh alur produksi. Database produksi, rekening koran, pengukuran waktu kerja petugas, dan penggunaan oleh mahasiswa tidak diperiksa. Sumber ini juga merujuk dokumen “Business Understanding”, tetapi dokumen terpisah tersebut tidak diberikan. Pernyataan “belum terlihat” dibatasi pada jalur kode yang diperiksa.

Analisis ini tidak mengubah aplikasi atau workbook sumber. Konfirmasi pengelola dalam percakapan juga digunakan: KIP-K 2026 membayar pribadi sesuai tarif; cicilan tetap tersedia; penghuni yang telah check-in pada data impor dianggap sudah membayar.

## 3. Pemetaan tujuan bisnis

Sumber: sheet **Business Objective**, baris 3–13. ID bukti E01–E12 merujuk bagian 11.

| Tujuan | Penilaian | Dukungan yang sudah tersedia | Penyesuaian yang dibutuhkan |
| --- | --- | --- | --- |
| BO-001 Informasi dan kemudahan pendaftaran | Dukungan kuat | Informasi publik dinamis, portal pendaftaran, kategori, katalog kamar, foto, serta tahapan pembayaran. | Tetapkan daftar persyaratan per kategori dan ukur pendaftaran selesai tanpa bantuan. Jangan menganggap pertanyaan berulang sudah turun tanpa data. E01, E02. |
| BO-002 Ketepatan dan kecepatan penempatan | Parsial | Pemeriksaan kapasitas, reservasi, prioritas lantai, kategori dan jenis kelamin; undangan teman untuk pendaftar yang memenuhi syarat. | Pisahkan kesiapan kamar dari keterisiannya, pastikan pejabat penempatan, dan lengkapi proses perpindahan. E02, E03, E05. |
| BO-003 Akurasi data dan riwayat penghuni | Parsial | Data profil dan penempatan terpusat, riwayat hunian, impor dengan pemeriksaan konflik. | Selesaikan konflik identitas, data kontak/prodi, dan riwayat perpindahan. Bedakan data terverifikasi dari asumsi impor. E02, E07. |
| BO-004 Verifikasi dan pencatatan pembayaran | Parsial | Bukti pembayaran, verifikasi admin, pembukuan tagihan, cicilan dan dokumen. | Rekonsiliasi penerimaan historis, konsistensi label pembayaran, serta pencatatan waktu transaksi asli. Verifikasi bukti internal belum sama dengan pencocokan otomatis bank. E06, E07. |
| BO-005 Keterlacakan penanganan kerusakan | Dukungan kuat | Tiket terpusat, penugasan/pengambilan pekerjaan, riwayat status dan bukti penyelesaian; temuan inspeksi dapat menjadi tiket. | Tambahkan pemantauan umur tiket, target penanganan dan eskalasi agar kebutuhan follow-up berkurang. E08. |
| BO-006 Efisiensi absensi dan rekap pembinaan | Parsial | Scan mandiri, sesi QR, daftar peserta dan catatan kehadiran. | Lengkapi rekap per periode dan keluaran iqab/reward berdasarkan aturan yang disetujui. E04. |
| BO-007 Akurasi hadir/izin/sakit/alfa | Parsial | Pemeriksaan lokasi/waktu, pencegahan scan ganda, koreksi dengan alasan dan audit. | Model final yang ditinjau masih hadir/tidak hadir; izin dan sakit perlu menjadi sumber penentuan status. E04, E09. |
| BO-008 Perizinan dan kesesuaian kehadiran | Parsial | Pengajuan, keputusan, pembatasan akses per gedung, bukti sampai/kembali dengan waktu dan lokasi. | Perbaiki batas hari dan hubungan ke absensi; pastikan proses sakit dan keterlambatan kembali. E04, E09. |
| BO-009 Ketepatan surat bebas asrama | Dukungan kuat | Pemeriksaan hunian/tagihan, jalur alumni, dokumen elektronik, penanda tangan dan mekanisme verifikasi dokumen. | Lengkapi rekonsiliasi historis agar tidak adanya tagihan tidak keliru dianggap bukti lunas. E07, E10. |
| BO-010 Monitoring operasional pimpinan | Parsial | Ringkasan penghuni, kamar, tiket, pengajuan, keuangan dan aset. | Tambahkan indikator waktu layanan, tunggakan, izin terlambat, check-out tertunda, serta kualitas data dengan filter periode/gedung. E11. |
| BO-011 Ketertiban check-out dan kesiapan kamar berikutnya | Parsial | Pengajuan, inspeksi GO, pemeriksaan seluruh aset tercatat, tiket temuan, pemeriksaan utang dan pembaruan hunian. | Hubungkan hasil inspeksi ke status kesiapan kamar dan sepakati perlakuan iqab/kewajiban kerusakan. E05, E08. |

## 4. Temuan utama dan contoh dampaknya

### T01. Aturan izin tidak sama dengan batas 6 hari

**Prioritas: P0 — sebelum menjadikan sistem rujukan tunggal perizinan.**

Pada **Stakeholder Register F11**, mahasiswa hanya dapat mengajukan izin dalam rentang batas 6 hari. Pada **Scope D11/H11**, aturan batas hari dan persetujuan memang masih harus dipastikan.

`PerizinanController::store()` memeriksa tanggal kembali tidak lebih awal dari tanggal mulai, lalu menghitung seluruh pengajuan sebelumnya. Jika jumlah sebelumnya lebih dari 6, pengajuan menunggu keputusan; jika 0 sampai 6, status langsung sedang izin. Pengajuan yang ditolak ikut terhitung karena kueri menghitung semua status. Tes yang ada juga mengunci batas berdasarkan jumlah pengajuan, bukan durasi. E09.

**Contoh penelusuran aturan:** pengajuan pertama untuk rentang 20 hari tidak terkena pemeriksaan maksimum 6 hari pada method tersebut. Sebaliknya, setelah 7 pengajuan sebelumnya, izin singkat berikutnya akan menunggu keputusan. Ini contoh pembacaan logika kode, bukan simulasi transaksi di produksi.

**Usulan:** pengelola memutuskan apakah batas 6 hari berlaku per izin atau kumulatif per periode; tetapkan cara menghitung hari, pengecualian sakit/kegiatan, izin ditolak, dan pejabat pemberi pengecualian. Setelah keputusan itu, validasi durasi dan persetujuan harus mengikuti aturan yang sama.

### T02. Izin belum otomatis menjelaskan ketidakhadiran

**Prioritas: P0.**

Dokumen mengharapkan izin yang disetujui tercermin pada absensi (**BO-007, BO-008; Scope H11**). Pada jalur yang diperiksa, pengajuan izin disimpan sendiri. Daftar peserta sesi membaca `ActivityAttendance.is_present`; koreksi menerima boolean hadir/tidak hadir dan alasan. Penutupan sesi hanya menandai sesi ditutup. Belum terlihat penggabungan izin yang berlaku untuk menentukan status Izin/Sakit. E04, E09.

Akibatnya, mahasiswa yang sah sedang izin dapat tetap terlihat tidak hadir dan perlu diperbaiki manual. Ini mempertahankan salah satu masalah awal fasilitator.

**Usulan:** hasil akhir per peserta dan kegiatan adalah Hadir, Izin, Sakit, atau Alfa, dengan sumber status dan jejak koreksi. Gunakan waktu kegiatan dan periode izin yang berlaku; jangan mengubah semua riwayat ketika izin berikutnya dibuat. Konflik scan hadir saat sedang izin juga memerlukan aturan yang jelas.

### T03. Kamar kosong belum tentu siap dihuni

**Prioritas: P0.**

**Scope H6** secara eksplisit meminta perbedaan kosong, tersedia, layak/siap, dan sedang perbaikan. Inspeksi sudah memperbarui kondisi aset dan membuat tiket. Akan tetapi, pembuatan tiket temuan yang diperiksa tidak menandai kamar maintenance. Penyelesaian check-out menghitung kembali status kosong/penuh/terisi sebagian, kecuali kamar sebelumnya sudah maintenance. Pemeriksaan penempatan kemudian membaca status kamar dan kapasitas, bukan tingkat kerusakan aset. E03, E05, E08.

**Contoh penelusuran aturan:** penghuni terakhir keluar dari kamar yang awalnya bukan maintenance, sedangkan inspeksi mencatat aset rusak berat. Jalur saat ini dapat menghasilkan kamar kosong bersama tiket perbaikan terbuka. Belum ada jaminan otomatis pada jalur tersebut bahwa kamar ditutup untuk pendaftar baru.

**Usulan:** simpan keterisian dan kesiapan sebagai dua hal terpisah. Temuan yang membuat kamar tidak layak harus memblokir penempatan; GO/pengelola memverifikasi kesiapan sebelum pembukaan kembali. Tidak semua kerusakan ringan harus otomatis menutup kamar: klasifikasi dampaknya perlu disepakati.

### T04. Konfirmasi pembayaran impor belum menjadi status pembayaran yang konsisten

**Prioritas: P0 untuk pelaporan keuangan dan komunikasi kepada penghuni.**

Sesuai konfirmasi pengelola, penghuni yang telah check-in dianggap sudah membayar dan tidak perlu ditagih ulang untuk impor tersebut. Importer menyimpan penjelasan itu di catatan penempatan, tanpa mengarang nominal atau tanggal transaksi. Namun, komponen `PaymentStatusBadge` menampilkan Belum bayar jika daftar pembayaran kosong. Komponen itu digunakan pada halaman penempatan. E07.

Selain itu, komponen membaca pembayaran terakhir. Satu pembayaran yang diverifikasi belum tentu melunasi seluruh tagihan jika penghuni mencicil. Status transaksi dan status pelunasan keseluruhan harus dibedakan. E06, E07.

**Usulan:** tampilkan sumber status, misalnya Terbayar berdasarkan konfirmasi impor dan Rincian transaksi belum direkonsiliasi. Status tagihan keseluruhan dihitung dari kewajiban dan alokasi pembayaran, bukan transaksi terakhir. Rekonsiliasi historis harus menyimpan penerimaan sebenarnya ketika data keuangan tersedia. Jangan menerbitkan utang baru hanya karena ledger impor belum lengkap, dan jangan menghitung catatan konfirmasi sebagai penerimaan uang baru.

### T05. Aktivasi hunian belum membuktikan check-in fisik dan pemeriksaan berkas

**Prioritas: P1 — keputusan proses sebelum menambahkan tahap.**

**Scope C7/H7** menyebut pemeriksaan berkas dan status administrasi saat check-in. Pada pendaftaran reguler, pembayaran lunas atau pembayaran awal yang memenuhi aturan dapat menyelesaikan pendaftaran dan mengaktifkan hunian. Jalur yang diperiksa tidak memperlihatkan gerbang pemeriksaan berkas/kedatangan fisik yang terpisah. E02, E06.

Untuk hunian sementara, penempatan dapat langsung aktif ketika admin membuat hunian dan invoice, sehingga aturannya memang berbeda dari pendaftaran reguler. Ini perlu ditulis sebagai pengecualian yang disetujui, bukan dibiarkan tersirat. E12.

**Usulan:** bila dibutuhkan pengelola, bedakan Terdaftar, Administrasi memenuhi syarat, Kamar dipesan, dan Sudah check-in. Catat petugas pemeriksa, waktu kedatangan, serta checklist berkas per kategori. Pembayaran tidak boleh dipakai sebagai pengganti fakta kedatangan fisik.

### T06. Iqab/reward dan kewajiban check-out belum lengkap

**Prioritas: P1.**

**Stakeholder Register D5/E5/D6**, **BO-006**, dan **Scope C10/C13** mengharapkan rekap pembinaan menghasilkan informasi iqab/reward dan pemeriksaan kewajiban saat check-out. Dalam action/controller absensi dan penyelesaian check-out yang ditinjau, belum terlihat mesin rekap iqab/reward atau pemeriksaan penyelesaiannya. Check-out sudah memeriksa inspeksi dan utang pribadi. E04, E05.

**Usulan:** sepakati kegiatan yang wajib, periode hitung, ambang, pengecualian izin/sakit, koreksi dan pengesahan hasil. Setelah itu baru tentukan apakah iqab merupakan penghalang check-out atau catatan tindak lanjut. Jangan membuat ambang atau sanksi berdasarkan asumsi pengembang.

### T07. Pemilik penempatan dan proses perpindahan perlu dipastikan

**Prioritas: P1.**

**Stakeholder Register F4** memberi fasilitator wewenang menentukan kamar. Permission awal fasilitator saat ini mencakup pembukaan lantai dan beberapa proses operasional, tetapi tidak `registration.review`. Review dan penentuan kamar KIP-K berada pada jalur admin layanan/staff admin. Ini perbedaan pembagian tanggung jawab yang perlu divalidasi, bukan alasan memberi seluruh permission admin kepada fasilitator. E02, E12.

**Scope SC-003** juga mencakup perpindahan kamar. Action penempatan yang ditinjau menolak mahasiswa yang sudah mempunyai penempatan aktif. Belum ditemukan alur perpindahan tersendiri dalam action/service dan route yang ditelusuri.

**Usulan:** tetapkan penempatan oleh admin atau fasilitator per gedung. Buat proses perpindahan terkontrol yang menutup penempatan lama, membuat penempatan baru, mencatat alasan/persetujuan/tanggal efektif, memperbarui kapasitas dua kamar dan menghitung selisih tarif bila ada. Jangan memaksa mahasiswa check-out dari asrama hanya untuk pindah kamar.

### T08. Tiket terpusat sudah membantu, tetapi belum menjamin tidak ada follow-up manual

**Prioritas: P1.**

Alur laporan sudah lebih terstruktur dan teknisi dapat mengambil pekerjaan. Namun kebutuhan pada **Business Problem Register D11** adalah mengurangi follow-up harian. Riwayat status dan bukti selesai tidak otomatis memberitahu teknisi bahwa pekerjaan menunggu atau melewati target. Pada jalur tiket dan scheduler yang diperiksa belum terlihat pengingat/eskalasi berbasis umur tiket. E08.

**Usulan:** daftar pekerjaan saya, tiket belum ditangani, umur tiket, prioritas dampak, target respons dan eskalasi internal. WhatsApp tidak harus menjadi tahap pertama karena integrasinya sendiri masih perlu keputusan.

### T09. Dashboard perlu mengukur hasil proses

**Prioritas: P1 setelah sumber datanya benar.**

Dashboard pimpinan sudah menampilkan beberapa ringkasan. Namun indikator tujuan bisnis mencakup waktu penempatan, waktu verifikasi, waktu penyelesaian kerusakan, akurasi izin/absensi, serta check-out dan surat yang tertunda. Ringkasan yang diperiksa belum memberi gambaran lengkap atas indikator tersebut. Label Okupansi juga menggunakan jumlah kamar penuh dibanding total kamar, yang berbeda dari persentase tempat tidur terisi. E11.

**Usulan:** sepakati definisi ukuran, periode, pemilik dan sumber data. Bedakan kamar penuh, kamar berpenghuni, kapasitas tempat tidur, reservasi, dan kamar layak huni. Jangan membandingkan angka yang memakai penyebut berbeda.

## 5. Kesesuaian seluruh cakupan

Sumber: sheet **Scope A3:H20**. Status usulan pada dokumen tidak diperlakukan sebagai keputusan final.

| Scope | Penilaian aplikasi | Tindak lanjut |
| --- | --- | --- |
| SC-001 Pendaftaran lokal | Tersedia, sebagian aturan perlu dipastikan | Syarat berkas, pengecualian KIP-K 2026, cicilan dan check-in fisik. |
| SC-002 Internasional/summer course | Sebagian sudah tersedia; perlu keputusan | Sahkan alur unit pemohon, pembayar organisasi, sponsor, invoice dan check-in. |
| SC-003 Penempatan/perpindahan | Penempatan tersedia, perpindahan belum terlihat lengkap | Selesaikan wewenang dan transaksi perpindahan. |
| SC-004 Ketersediaan/kesiapan | Parsial | Pisahkan keterisian dari kesiapan setelah inspeksi/perbaikan. |
| SC-005 Check-in | Aktivasi administrasi tersedia | Putuskan checklist dan konfirmasi kedatangan fisik. |
| SC-006 Data/riwayat | Tersedia sebagian besar | Rekonsiliasi konflik sumber, kelengkapan kontak dan perpindahan. |
| SC-007 Pembayaran | Verifikasi internal tersedia | Rekonsiliasi historis dan pelunasan tagihan. Integrasi bank bukan syarat otomatis. |
| SC-008 Absensi/pembinaan | Scan dan koreksi tersedia | Lengkapi status akhir, rekap periode, iqab/reward. |
| SC-009 Perizinan/kehadiran | Pengajuan dan bukti kembali tersedia | Perbaiki aturan hari dan hubungan ke absensi. |
| SC-010 Kerusakan | Dukungan kuat | Umur tiket, target respons, prioritas dan eskalasi. |
| SC-011 Check-out/inventaris | Inspeksi dan penyelesaian tersedia | Kesiapan kamar dan aturan kewajiban non-tagihan. |
| SC-012 Surat bebas asrama | Dukungan kuat | Kualitas arsip/pembayaran historis dan pengesahan format final. |
| SC-013 Monitoring pimpinan | Parsial | KPI menyeluruh, filter periode, tindak lanjut dan sumber angka. |
| SC-014 Manajemen aset umum | Sudah ada bagian implementasinya, scope belum final | Tetapkan batas antara inventaris operasional dan siklus aset lengkap. |
| SC-015 Integrasi bank | Perlu keputusan | Jangan menyamakan VA/bukti unggah dengan koneksi langsung bank. |
| SC-016 WhatsApp/notifikasi eksternal | Perlu keputusan | Prioritaskan notifikasi internal dan putuskan kanal eksternal terpisah. |
| SC-017 Monitoring orang tua | Fondasi akun tertaut dan info hunian tersedia | Informasi pembinaan/izin belum setara harapan penuh; persetujuan dan batas akses harus disahkan. |
| SC-018 Renovasi fisik | Di luar pengembangan aplikasi | Web membantu laporan/pemantauan, bukan mengerjakan perbaikan fisik. |

## 6. Penyesuaian dokumen proses bisnis

Dokumen penemuan kebutuhan ini sudah memiliki hubungan masalah, tujuan dan scope yang berguna. Agar menjadi acuan implementasi dan penerimaan, tambahkan keputusan berikut tanpa menghapus catatan kebutuhan awal:

1. **Pisahkan kondisi sekarang dan proses yang disepakati.** Banyak scope masih usulan atau perlu keputusan. Tambahkan pemilik keputusan, tanggal, dan hasil validasi.
2. **Buat matriks aturan per kategori.** Minimal: KIP-K 2026, KIP-K angkatan lain, non-KIP-K maba, mahasiswa non-maba, internasional, summer course, dan non-mahasiswa. Kolomnya mencakup pemilih kamar, pembayar, tarif, cicilan, berkas dan syarat check-in.
3. **Tulis pengecualian KIP-K 2026 secara eksplisit.** Status penerima KIP-K tetap, pembiayaan pribadi mengikuti tarif kamar; pembayaran historis tidak ditagih ulang. Tetapkan masa berlaku kebijakan bila hanya untuk periode tertentu karena konfigurasi saat ini berbasis angkatan.
4. **Sahkan aturan izin.** Batas hari, akumulasi, sakit, kegiatan, persetujuan, bukti kembali, keterlambatan dan dampaknya pada absensi.
5. **Definisikan status kamar.** Kosong/penuh adalah keterisian; siap/belum siap/perbaikan adalah kesiapan. Tetapkan siapa yang mengesahkan pembukaan kembali.
6. **Buat pembagian penanggung jawab.** Selaraskan fasilitator, admin layanan, admin aset, GO, teknisi dan pimpinan dengan permission aplikasi per gedung.
7. **Tetapkan rumus dan target indikator.** BO-010 D12 memuat pengulangan indikator waktu memperoleh laporan; rapikan menjadi ukuran yang berbeda dengan sumber dan frekuensi jelas. Jangan menambahkan target numerik tanpa persetujuan pengelola.
8. **Definisikan penerimaan proses, bukan keberadaan menu.** Contohnya: izin disetujui harus mengubah hasil kehadiran kegiatan dalam rentang izin, tanpa petugas mengisi ulang.

## 7. Data impor yang perlu dipantau

Pembacaan berkas lokal `database/seeders/data/residents-2026.json` menghasilkan:

| Ukuran | Jumlah | Arti |
| --- | ---: | --- |
| Mahasiswa dalam daftar rekonsiliasi | 1.474 | Rekaman mahasiswa, bukan hitungan baris seluruh workbook asal. |
| Mahasiswa dengan isu sumber | 10 | Memerlukan penyelesaian konflik sebelum impor normal. |
| Mahasiswa tanpa isu sumber | 1.464 | 805 local_kipk, 401 local_non_kipk, 258 student. |
| Mahasiswa tanpa isu dan mempunyai catatan check-in | 1.200 | Kandidat check-in berdasarkan sumber, bukan pembuktian isi database produksi. |
| Baris sumber unresolved | 156 | Baris bermasalah; tidak boleh otomatis dianggap 156 orang tambahan. |

Angka di atas berasal dari artefak lokal, bukan hitungan penghuni aktif produksi. Status siap pada data sumber juga tidak menjamin seluruh akun mempunyai email/prodi lengkap. Pembayaran yang dikonfirmasi melalui check-in perlu dibedakan dari penerimaan yang telah direkonsiliasi nominal/tanggalnya.

## 8. Urutan tindak lanjut

P0 berarti perlu dibereskan sebelum proses terkait dijadikan satu-satunya rujukan operasional. P1 adalah kelengkapan proses inti. P2 menunggu keputusan cakupan atau data pengukuran.

| Urutan | Tindakan | Pemilik keputusan | Kriteria selesai |
| --- | --- | --- | --- |
| P0-1 | Sahkan dan terapkan aturan izin 6 hari | Pengelola, fasilitator | Pengajuan di atas batas ditolak/masuk pengecualian sesuai aturan durasi, bukan jumlah pengajuan. |
| P0-2 | Hubungkan izin/sakit dengan absensi | Pengelola pembinaan | Rekap menampilkan Hadir/Izin/Sakit/Alfa dengan sumber dan audit; izin sah tidak menjadi alfa. |
| P0-3 | Hubungkan inspeksi, kerusakan dan kesiapan kamar | GO, admin aset, pengelola | Kamar dengan temuan yang menghalangi hunian tidak dapat dipesan sampai diverifikasi siap. |
| P0-4 | Samakan status pembayaran impor dan tagihan | Keuangan/admin layanan | Penghuni terkonfirmasi membayar tidak tampil Belum bayar; tidak ada penerimaan atau utang ganda. |
| P1-1 | Pisahkan administrasi dari check-in fisik bila diperlukan | Admin layanan, fasilitator | Keberadaan penghuni aktif dapat ditelusuri ke pemeriksaan berkas dan petugas kedatangan. |
| P1-2 | Tetapkan dan bangun rekap iqab/reward | Pengelola pembinaan | Hasil per periode mengikuti aturan, mengecualikan izin/sakit, dan dapat disahkan/koreksi. |
| P1-3 | Selaraskan wewenang dan perpindahan kamar | Pengelola, fasilitator | Perpindahan menyimpan riwayat dan tidak menyebabkan penempatan ganda. |
| P1-4 | Tambahkan pemantauan umur tiket | Admin aset, teknisi | Petugas dapat melihat tiket lewat target dan penanggung jawab tanpa rekap manual. |
| P1-5 | Lengkapi dashboard hasil proses | Pimpinan, pemilik data | KPI bersumber dari data transaksi, memiliki periode dan dapat ditelusuri ke rincian. |
| P1-6 | Perbaiki dan jalankan ulang tes perjalanan lengkap | Tim pengembang | Skenario daftar sampai surat lolos dengan master tipe kamar yang valid. |
| P2 | Putuskan bank, kanal eksternal, orang tua dan kedalaman aset | Pimpinan dan unit terkait | Scope, biaya, pemilik dan kriteria penerimaan tertulis. |

## 9. Skenario penerimaan bersama pengguna

Skenario berikut adalah usulan pengujian penerimaan; belum semuanya dijalankan dalam audit ini.

| Skenario | Hasil yang harus disepakati/dibuktikan |
| --- | --- |
| Non-KIP-K memesan tempat terakhir | Reservasi kedua tidak mengambil tempat yang sama. |
| Mahasiswa mengundang teman yang memenuhi syarat | Tidak melampaui kapasitas; penerimaan hunian tetap mengikuti kelengkapan dan kewajiban pembayaran penerima undangan. |
| Lantai prioritas utama masih tersedia | Pembukaan lantai berikutnya mengikuti aturan prioritas dan kategori. |
| KIP-K 2026 mendaftar baru | Status kategori tetap KIP-K, tagihan pribadi sesuai kamar, bukan subsidi penuh otomatis. |
| Penghuni mengunggah bukti pembayaran | Belum dianggap pembayaran terverifikasi hanya karena file diunggah. |
| Cicilan awal disetujui dan dibayar | Aktivasi mengikuti kebijakan; sisa tagihan tetap terlihat dan menghalangi check-out bila belum lunas. |
| Penghuni impor sudah check-in dan dikonfirmasi membayar | Tidak ditagih ulang dan tidak ditandai Belum bayar hanya karena transaksi historis belum dimigrasi. |
| Izin 6 hari dan melewati batas | Hasil mengikuti definisi hitung hari dan pengecualian yang telah disahkan. |
| Izin sah bertepatan dengan pembinaan | Status akhir Izin; tidak perlu koreksi manual menjadi bukan Alfa. |
| Mahasiswa sakit dengan bukti sah | Status Sakit tercatat dan diperlakukan benar dalam rekap pembinaan. |
| Mahasiswa kembali lewat rencana | Terlihat sebagai perlu tindak lanjut, tanpa salah mengasumsikan sudah kembali. |
| Aset penting rusak saat check-out | Tiket terbentuk, kesiapan kamar diblokir, dan tidak terbuka hanya karena penghuni keluar. |
| Perbaikan selesai | Petugas yang berwenang memverifikasi kesiapan sebelum kamar ditawarkan lagi. |
| Pindah kamar | Riwayat lama tetap ada, kapasitas dua kamar benar, serta tarif/selisih dapat ditelusuri. |
| Surat bebas asrama | Hunian dan kewajiban diverifikasi, dokumen dapat diunduh dan diverifikasi keasliannya melalui mekanisme aplikasi. |
| Pimpinan membuka laporan suatu periode | Angka konsisten dengan transaksi rinci dan tidak mencampur konfirmasi impor dengan penerimaan baru. |

## 10. Hasil pengujian audit

Tes yang telah tersedia dijalankan tanpa mengubah kode atau data produksi:

```text
php artisan test --compact tests/Feature/Attendance/ActivityAttendanceTest.php tests/Feature/CheckoutLifecycleTest.php tests/Feature/CheckoutEndpointTest.php tests/Feature/BusinessProcessJourneyTest.php
Hasil: 33 tes, 32 lolos, 1 gagal, 89 assertion.

php artisan test --compact tests/Feature/LeaveMonitoringTest.php tests/Feature/RoomInvitationsAndFloorPriorityTest.php
Hasil: 18 tes, 18 lolos, 130 assertion.

Total: 51 tes, 50 lolos, 1 gagal.
```

Tes perjalanan lengkap gagal pada pendaftaran dengan pesan tipe/kapasitas kamar tidak sesuai master. Fixture menggunakan `tipe_kamar = single`, sedangkan jalur validasi mensyaratkan tipe aktif pada master. Perbaikan yang tepat adalah menyelaraskan fixture dengan master yang sah lalu menjalankan ulang perjalanan lengkap. Kegagalan ini tidak membuktikan bahwa seluruh proses pendaftaran produksi rusak.

Tes izin yang lolos saat ini justru menguji batas jumlah pengajuan sebelumnya. Karena itu, tes lolos belum membuktikan kesesuaian dengan aturan 6 hari dalam dokumen. Temuan T01–T09 terutama berasal dari pencocokan aturan dan sumber kode; tidak seluruhnya dibuktikan dengan tes reproduksi baru. Pengukuran manfaat di lapangan dan pengujian semua skenario pada bagian 9 masih perlu dilakukan.

## 11. Bukti implementasi yang ditinjau

Path berikut relatif terhadap root proyek. Sumber aktual dibaca untuk memeriksa temuan material; nomor baris dapat berubah setelah pengembangan berikutnya.

| ID | Sumber | Fakta yang digunakan |
| --- | --- | --- |
| E01 | `routes/andalas.php`; halaman landing/CMS yang telah dikembangkan | Titik masuk informasi publik dan pengelolaan konten. Keberadaan route tidak dianggap bukti efektivitas komunikasi. |
| E02 | `app/Actions/Registration/SubmitResidenceRegistration.php`; `CompleteResidenceRegistration.php:23`; `PlaceResidenceRegistration.php`; `config/residence.php` | Pembiayaan kategori, tagihan, syarat aktivasi dan penempatan aktif. |
| E03 | `app/Services/RoomEligibility.php:66`; `tests/Feature/RoomInvitationsAndFloorPriorityTest.php` | Pembatasan kapasitas/kategori/status kamar; pengujian undangan dan prioritas lantai. |
| E04 | `app/Actions/Attendance/RecordAttendanceAttempt.php`; `CloseAttendanceSession.php`; `app/Services/AttendanceRoster.php`; `app/Http/Controllers/AbsensiController.php:44`; `app/Models/ActivityAttendance.php:9` | QR/lokasi/waktu, peserta, hadir/tidak hadir, koreksi dan penutupan sesi. |
| E05 | `app/Actions/Checkout/CompleteCheckout.php:50`; `app/Http/Controllers/CheckoutController.php:89` | Pemeriksaan utang, inspeksi aset dan pembaruan keterisian kamar. |
| E06 | `app/Http/Controllers/PembayaranController.php:96`; `app/Actions/Registration/CompleteResidenceRegistration.php:26` | Verifikasi manual, pembukuan dan syarat pembayaran awal/lunas. |
| E07 | `app/Services/Residence2026StudentImport.php:288`; `resources/js/andalas/components/atoms/PaymentStatusBadge.tsx:31`; `resources/js/andalas/pages/admin/PenempatanKamar.tsx`; `database/seeders/data/residents-2026.json` | Konfirmasi pembayaran impor, label berdasarkan transaksi terakhir, dan hitungan data sumber. |
| E08 | `app/Actions/DamageReports/CreateDamageReport.php`; `TriageDamageReport.php`; `CompleteDamageReport.php`; `app/Actions/Checkout/CreateDamageReportFromFinding.php`; `routes/console.php` | Tiket, penugasan, bukti perbaikan, tiket inspeksi dan lingkup scheduler yang diperiksa. |
| E09 | `app/Http/Controllers/PerizinanController.php:42`; `tests/Feature/LeaveMonitoringTest.php:41` | Batas jumlah pengajuan, tanggal izin dan bukti sampai/kembali. |
| E10 | `app/Actions/ApproveFreeResidenceLetter.php`; `app/Http/Controllers/PengajuanController.php`; `routes/andalas.php` | Pemeriksaan hunian/utang, bukti historis dan jalur dokumen. |
| E11 | `app/Http/Controllers/RolePageController.php:409`; `resources/js/andalas/pages/pimpinan/DashboardEksekutif.tsx:82` | Ringkasan operasional dan definisi angka Okupansi yang tampil. |
| E12 | `database/seeders/RolePermissionSeeder.php:199`; `routes/role-pages.php`; `app/Actions/Registration/CreateTemporaryStay.php`; `resources/js/pages/orang_tua/dashboard.tsx` | Pembagian wewenang awal, hunian sementara dan lingkup tampilan orang tua. |

Kesimpulan penerimaan yang disarankan: **lanjutkan pengembangan dari fondasi yang ada, dengan penerimaan bertahap per proses setelah aturan lintas modul dan kualitas data diperbaiki.** Pengelola sebaiknya belum menyatakan semua tujuan Business Discovery selesai hanya berdasarkan keberadaan fitur.

## 12. Tindak lanjut T01 dan T02 — 17 Oktober 2026

Setelah audit, pengelola menegaskan bahwa batas izin adalah **6 hari setiap bulan kalender**, bukan per pengajuan. Untuk sakit, bukti pendukung dan persetujuan fasilitator wajib tersedia.

Perubahan kode lokal untuk dua temuan tersebut sudah diterapkan:

- Kuota izin pulang kampung/kegiatan menghitung tanggal mulai dan kembali secara inklusif. Izin lintas bulan dibagi ke bulan masing-masing; hari tumpang tindih dihitung sekali. Izin ditolak dan sakit tidak mengurangi kuota izin biasa. Bukti kembali lebih awal membatasi pemakaian hari pada tanggal kembali aktual.
- Sakit diajukan dengan bukti privat, menunggu keputusan fasilitator gedung terkait, dan baru menjadi Sakit pada absensi setelah disetujui. Sakit tidak memerlukan bukti perjalanan sampai/kembali.
- Absensi fasilitator dan riwayat mahasiswa membaca status berdasarkan tanggal kegiatan dalam WIB. Izin/sakit yang disetujui tidak perlu disalin manual ke setiap kegiatan. Bukti hadir dan koreksi manual dipertahankan; persetujuan sakit setelah sesi berakhir juga tercermin dalam riwayat.
- Sebelum sesi selesai, peserta tanpa scan atau izin sah berstatus Belum absen; sesudahnya berstatus Alfa. Riwayat scan lama yang belum memiliki daftar peserta tetap ditampilkan.

Validasi terkait: 46 tes backend dan 4 tes tampilan lolos, termasuk batas bulanan, lintas tahun, kembali lebih awal, persetujuan sakit, perlindungan koreksi manual, serta kegiatan pagi WIB yang tanggal UTC-nya berbeda. TypeScript dan build juga diperiksa. Perubahan ini belum diterapkan ke produksi. Bagian 1–11 tetap merupakan catatan audit terhadap commit awal, bukan klaim bahwa temuan lain telah diselesaikan.
