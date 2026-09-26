# Audit kesesuaian implementasi dengan Alur Proses Bisnis Andalas Residence

Diperiksa dan diperbarui 26 September 2026. Lampiran **Alur Proses Bisnis Andalas Residence** (dan ringkasannya di [Acuanprobis.txt](Acuanprobis.txt)) menjadi acuan utama; [PLAN.md](PLAN.md) hanya melengkapi ketentuan yang tidak bertentangan.

## Jawaban tegas

**Seluruh ketentuan lampiran kini terimplementasi.** Dari 57 ketentuan yang diperiksa: **52 sesuai**, **5 sebagian sesuai**, **0 belum sesuai**. Lima butir "sebagian" bersifat keterbatasan eksternal atau keputusan interpretasi yang terdokumentasi (definisi alumni sebagai state, kategori invoice berbasis JSON, VA manual tanpa integrasi bank, surat memakai "sisa tagihan nol" bukan `total=0`, dan email yang terlog ke file pada konfigurasi `MAIL_MAILER=log`).

Riwayat: audit pertama pada tanggal yang sama menemukan **3 belum** dan **13 sebagian**; perbaikan berikutnya menuntaskan seluruh butir P1 dan P2 (riwayat lengkap di bagian [Perbaikan yang dilakukan](#perbaikan-yang-dilakukan-26-september-2026)).

Cara baca status:

- **Sesuai** — implementasi ada dan/atau diuji sebagaimana bukti dikutip.
- **Sebagian** — ada, tetapi ada celah yang memengaruhi perilaku, konsistensi data, atau pengujian.
- **Belum** — tidak ada implementasi yang memenuhi ketentuan.
- **Belum terverifikasi** — bergantung perangkat, email nyata, atau bank; belum bisa dibuktikan dari kode/testing.

> Catatan metode: audit statis (baca sumber + jalankan suite). Keberadaan menu tidak pernah cukup untuk menyatakan "sesuai". Setiap klaim material di bawah sudah dicek ulang langsung ke sumber oleh auditor utama.

## Ringkasan per kelompok

| Kelompok | Sesuai | Sebagian | Belum | Butir yang masih sebagian |
| --- | ---: | ---: | ---: | --- |
| A. Aktor, gedung, kategori, tipe, tarif, dashboard pimpinan | 9 | 1 | 0 | definisi "alumni" adalah state turunan, bukan flag tersimpan |
| B. Pendaftaran, invoice, cicilan, kwitansi, invoice gabungan | 6 | 2 | 0 | kategori invoice via JSON; VA manual |
| C. Hunian sementara & checkout | 9 | 0 | 0 | — |
| D. Bebas asrama & dokumen digital | 10 | 2 | 0 | email hanya terlog (`MAIL_MAILER=log`); "tagihan 0" = sisa nol |
| E. Kerusakan, absensi, izin, aset, laundry/galon | 18 | 0 | 0 | — |
| **Total** | **52** | **5** | **0** | **57 ketentuan** |

## Matriks kesesuaian

### A. Aktor, gedung, kategori, tipe kamar, tarif, dashboard pimpinan

| No | Ketentuan lampiran | Aktor | Implementasi (file:line) | Bukti uji | Status | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Daftar aktor (Pimpinan, Fasilitator, Client KIPK/non-KIPK, mutasi/hunian, internasional, non-mahasiswa, Admin Layanan, Admin Aset, Teknisi, Orang tua, GO, Superadmin) | Semua | `RolePermissionSeeder.php:109-234`; `DatabaseSeeder.php:31`; `ClientProfileCategory.php:9-13` | `ActorAccessMatrixTest.php`; `RolePermissionMatrixTest.php` | Sesuai | "Admin" lampiran dipetakan ke `staff_admin`; role teknis tambahan `tamu` untuk hunian sementara. |
| A2 | Alumni = mahasiswa asrama yang sudah check-out | Client/Alumni | `ResidenceLifecycle.php:25-30,53-59`; arsip `LegacyResident` | `ResidenceBusinessRevisionTest.php`; `ComprehensiveSeederTest.php:69` | Sebagian | "Alumni" adalah state turunan (riwayat berakhir), bukan flag tersimpan. Perilaku benar; istilah tidak eksplisit. |
| A3 | 10 gedung: RPX (A), Rusunawa (B), Pupera Puteri (C), Menpera (D), RMS (E), Oren (F), Hijau (G), Pupera Putera (H), ASN, Nakes; masing-masing punya fasilitator | Fasilitator | `ResidenceBuildingSeeder.php:12-23`; seeder penugasan `ResidenceScenarioSeeder.php:186-208`; `FasilitatorWilayah` | `RegistrationRevisionTest.php:76-84`; `ComprehensiveSeederTest.php` (73 akun skenario) | Sesuai | Nama & kode persis lampiran; 10 akun `fasilitator-<gedung>@example.test` ditugaskan satu gedung riil. |
| A4 | Tipe kamar: Standar, Medium, Premium | Admin Aset | `KamarController.php:74,82,98` (`standar,medium,premium`); migrasi data `2026_09_26_090000_align_room_types_with_rates.php` (`reguler→standar`, `vip→premium`); UI `KelolaBangunan.tsx` | `BuildingManagementTest.php:47-58`; `TemporaryStayTest.php:26-27` | Sesuai | Kosakata kamar & tarif kini sama; kamar lama dimigrasi otomatis. |
| A5 | Admin menyeting gedung per kategori (KIPK/non-KIPK/internasional/non-mahasiswa) | Admin Layanan | `allowed_categories` JSON (`revise_residence_business_workflows.php:27-31`); `ResidenceManagementController.php:41-43`; dipakai `RoomEligibility.php:24-33` | Tidak ada test endpoint | Sesuai | Fitur & guard ada; belum ada test endpoint `kind=building`. |
| A6 | Admin menyeting harga per gedung per tipe kamar | Admin Layanan | `residence_rates` unik `(gedung,tipe,unit)` (`revise...:70-80`); endpoint `ResidenceManagementController.php:38-40`; dipakai `:131` | `ComprehensiveSeederTest.php:64`; `ResidenceBusinessRevisionTest.php:126-134` | Sesuai | Tersedia untuk satuan `period` dan `day`. |
| A7 | Admin mendaftarkan maba KIPK per angkatan (kategori) | Admin Layanan | `KipkRecipient`; `ResidenceManagementController.php:35-37`; `ResidenceLifecycle.php` | `ResidenceBusinessRevisionTest.php:138-145` | Sesuai | Roster KIPK mengganti tiap angkatan; kategori ditentukan sistem, bukan pilihan client. |
| A8 | Dashboard pimpinan: laporan kerusakan | Pimpinan | `RolePageController.php:106-112,455-461`; `DashboardEksekutif.tsx:89-199` | `DashboardTest.php` (payload); `ComprehensiveSeederTest.php:132-137` (render) | Sesuai | — |
| A9 | Dashboard pimpinan: laporan hasil kinerja teknisi | Pimpinan | `RolePageController.php` (`performance` pada payload pimpinan, `teknisiPerformance()` `:286-303`); tabel di `DashboardEksekutif.tsx` | `DashboardTest.php` | Sesuai | — |
| A10 | Dashboard pimpinan: laporan pergedung (jumlah penghuni, kamar berisi, stok rusak) | Pimpinan | `buildingReport()` (`RolePageController.php`); `gedung_report` pada payload; tabel di `DashboardEksekutif.tsx` | `DashboardTest.php` | Sesuai | "Stok rusak" dihitung dari aset kamar berkondisi `rusak_ringan/rusak_berat/hilang`. |

### B. Pendaftaran, invoice, cicilan, kwitansi, invoice gabungan

| No | Ketentuan lampiran | Aktor | Implementasi (file:line) | Bukti uji | Status | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | Client daftar akun; sistem kategorikan angkatan dari NIM | Client | `CreateNewUser.php:40-51`; `StudentCohort.php:9-22` | `ClientAccountRegistrationTest.php:17-46`; `RegistrationRevisionTest.php:33-39` | Sesuai | Kategori lokal dari roster KIPK + jenjang, sesuai lampiran. |
| B2 | Maba = binaan (absensi/perizinan); non-maba = hunian (tanpa itu) | Sistem | `ResidenceLifecycle.php:32-45,53-60`; `AttendanceEligibility.php:15`; `PerizinanController.php:36` | `ResidenceBusinessRevisionTest.php:44-52`; `ActivityAttendanceTest.php:190-205` | Sesuai | — |
| B3 | KIPK tidak pilih kamar (admin menempatkan); non-KIPK pilih tipe & nomor | Client/Admin Layanan | `SubmitResidenceRegistration.php:39-74`; `ResidenceManagementController.php:113-143` | `ResidenceRegistrationWorkflowTest.php:98-116,237-258` | Sesuai | Preferensi client diabaikan bila bukan penerima KIPK. |
| B4 | Invoice: reguler sesuai tarif; internasional gratis Rp0; KIPK kewajiban Rp0 + tanggungan KIPK (masuk tabel kategori) | Sistem | `CreateResidenceBilling.php:29-42`; penempatan KIPK `ResidenceManagementController.php:130-138` | `ResidenceRegistrationWorkflowTest.php:237-258,397-419` | Sebagian | Rp0 & penyesuaian benar; kategori invoice hanya di JSON `residence_snapshot` (`Tagihan.php:24`), tidak ada kolom/tabel kategori. |
| B5 | Pembayaran; cicilan diatur admin pada VA & menu tagihan | Admin/Client | `InvoiceController.php:21-43`; `PembayaranController.php:50-63`; `mahasiswa/Tagihan.tsx:39-52` | `ResidenceRegistrationWorkflowTest.php:275-299` | Sebagian | Perubahan nominal + VA internal berpengaruh; **VA bukan integrasi bank** (memang belum diaktifkan lampiran ringkas). Sisa entitas `jadwal_cicilan`/`termin_ke` kontra semangat PLAN.md:81. |
| B6 | Kwitansi: besaran bayar, No. kamar, tipe, gedung, lama tinggal | Sistem | `billing-document.blade.php:16-40` (fallback snapshot + "Total dibayar" selalu tampil); `GenerateBillingDocument.php:50-66` | `BusinessProcessJourneyTest.php:73-76` | Sesuai | Elemen gedung/kamar/tipe hadir dari penempatan atau snapshot tagihan; masa tinggal mengikuti registrasi/periode. |
| B7 | Internasional/S2/S3 alur sama | Client | `ResidenceLifecycle.php:32-36`; `CreateNewUser.php:42-43` | `ClientAccountRegistrationTest.php:48-68`; `ResidenceRegistrationWorkflowTest.php:397-419` | Sesuai | Belum ada E2E khusus S2/S3 memilih kamar. |
| B8 | Invoice gabungan: field lengkap (Nomor, Tanggal otomatis, Kepada Yth, Mitra, Perihal, Bank, Rekening, Atas Nama, Batas Waktu, TTD Pimpinan) + ekspor | Admin | Validasi `InvoiceController.php:48-57`; tanggal otomatis `:68`; PDF `invoice-group.blade.php:1-17`; form `Invoices.tsx:413-482`; realtime polling `:193` | `ResidenceRegistrationWorkflowTest.php:349-374` | Sesuai | Semua field ada + blok "Mengetahui, Pimpinan Andalas Residence". Realtime = polling 5 s, bukan websocket. |

### C. Hunian sementara dan checkout

| No | Ketentuan lampiran | Aktor | Implementasi (file:line) | Bukti uji | Status | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | Admin input penghuni SC (Nama, NIM/NIK, lama huni, gedung & kamar) | Admin Layanan | `TemporaryStayController.php:33-43`; `CreateTemporaryStay.php:62-77` | `TemporaryStayTest.php:34-40,53-65` | Sesuai | Gedung menyatu pada dropdown kamar; lama huni via tanggal. |
| C2 | Data SC masuk tagihan invoice | Sistem | `CreateTemporaryStay.php:70` → `CreateResidenceBilling.php:28-43` | `TemporaryStayTest.php:40` | Sesuai | Tarif harian × jumlah malam. |
| C3 | Durasi habis → kamar kosong otomatis + notifikasi fasilitator gedung | Scheduler | `routes/console.php:14` (`everyMinute`); `EndTemporaryStays.php:17-48`; `TemporaryStayEnded.php:14-21` | `TemporaryStayTest.php:41-51` | Sesuai | Notifikasi kanal `database`; bergantung `schedule:run`/cron. |
| C4 | Fasilitator input non-mahasiswa + pilih kamar + tampilkan invoice | Fasilitator | `TemporaryStayController.php:44-51`; `TemporaryStays.tsx:23-304` | `TemporaryStayTest.php:53-65` | Sesuai | Fasilitator dibatasi `non_student` dan gedung penugasan. |
| C5 | Durasi non-mahasiswa habis → kamar kosong + notifikasi | Scheduler | `EndTemporaryStays.php:17,45-46` | `TemporaryStayTest.php:82-95` | Sesuai | Sama dengan C3. |
| C6 | Client klik checkout; sistem tampilkan syarat & mekanisme | Mahasiswa | `role-pages.php:8`; `andalas.php:166`; `Checkout.tsx:38-60` (menyebut sisa tagihan nol sebelum finalisasi) | `CheckoutEndpointTest.php:15-28` | Sesuai | — |
| C7 | GO cek kamar, input kondisi → update kerusakan | GO | `CheckoutController.php:35-115`; `CreateDamageReportFromFinding.php:24-41` | `CheckoutLifecycleTest.php:93-123` | Sesuai | Halaman GO tidak dibatasi wilayah; GO adalah petugas lintas gedung. |
| C8 | Sistem cek tagihan mahasiswa; finalisasi terblokir saat masih ada utang | Sistem | `CompleteCheckout.php:50-52` → `ResidenceLifecycle.php:62-66` | `CheckoutLifecycleTest.php` ("refuses checkout while ... unsettled personal invoices") | Sesuai | — |
| C9 | Tagihan 0 → fasilitator ubah status checkout; kamar kosong & ready | Fasilitator | `CheckoutController.php:125-133`; `CompleteCheckout.php:34-71` | `CheckoutLifecycleTest.php:56-80` | Sesuai | Status `Diproses`/`SiapCheckout` tidak dipakai; tak ada aksi tolak checkout. |

### D. Bebas asrama dan dokumen digital

| No | Ketentuan lampiran | Aktor | Implementasi (file:line) | Bukti uji | Status | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| D1 | Mahasiswa membuat akun & masuk menu bebas asrama | Mahasiswa | `role-pages.php:8`; `PengajuanBebasAsrama.tsx:33-139` | `ComprehensiveSeederTest.php:139`; `BusinessProcessJourneyTest.php:109` | Sesuai | — |
| D2 | Alumni lunas: unggah bukti + rekening koran | Mahasiswa | `PengajuanController.php:30-34,68-75` | `FreeResidenceLetterLifecycleTest.php:119-142` | Sesuai | — |
| D3 | Admin cek; tidak valid → tolak + pesan temui admin | Admin | `PengajuanController.php:106-111` (pesan persis di `:107`) | `FreeResidenceLetterLifecycleTest.php:144-154` | Sesuai | — |
| D4 | Valid → approve; tagihan jadi 0; surat otomatis; akun nonaktif | Sistem | `PengajuanController.php:112-128`; `ApproveFreeResidenceLetter.php:56-84` | `FreeResidenceLetterLifecycleTest.php:137-141` | Sebagian | Sisa tagihan 0 (bukan `total=0`, sesuai PLAN.md:46); surat masuk akun, email hanya driver `log`. |
| D5 | Surat dikirim otomatis ke akun/email | Sistem | `GenerateFreeResidenceLetter.php:51-72`; `DocumentReadyNotification.php:24-35` | `DocumentGenerationTest.php:79-142` | Sebagian | `MAIL_MAILER=log` → tidak benar-benar terkirim; butuh worker + SMTP. |
| D6 | Alumni belum lunas: invoice per angkatan; bayar VA → lunas → surat → nonaktif | Sistem+Admin | `CreateLegacyInvoice.php:14-38`; `LegacyResidenceRate.php`; `PengajuanController.php:81-99`; `PostPayment.php:78-89` | `FreeResidenceLetterLifecycleTest.php:76-99`; `ResidenceBusinessRevisionTest.php:164-179` | Sesuai | Verifikasi pelunasan manual admin; tidak ada auto-settle bank. |
| D7 | Bukan alumni tetapi **terdata** sebagai alumni → pengajuan ditolak + pesan + tampilkan tagihan | Sistem | `PengajuanController.php:81-99` (status `ditolak` + catatan "terdata sebagai alumni asrama" + invoice tetap diterbitkan); `PostPayment.php:80` menerima `Ditolak`; `ApproveFreeResidenceLetter.php:28-38` menerima penolakan yang tagihannya lunas | `FreeResidenceLetterLifecycleTest.php:76-99,157-172`; `ResidenceBusinessRevisionTest.php:164-193` | Sesuai | Setelah tagihan lunas, surat terbit otomatis dan akun nonaktif — sesuai cabang B lampiran. |
| D8 | Benar bukan alumni → surat otomatis + akun nonaktif | Sistem | `PengajuanController.php:65,78-80`; `ApproveFreeResidenceLetter.php:44-48,76` | `FreeResidenceLetterLifecycleTest.php:240-251` | Sesuai | — |
| D9 | Angkatan ≥2026: setelah checkout & tagihan 0 → surat otomatis | Sistem | `PengajuanController.php:41-46,78-80`; `ApproveFreeResidenceLetter.php:41-43,117-128` | `BusinessProcessJourneyTest.php:109-118` | Sesuai | — |
| D10 | Kelola penandatangan (nama, NIP, jabatan, unit); satu aktif | Admin | `DocumentSigner.php:10-26`; `DocumentSignerController.php:28-40,46-60` (store mengaktifkan baru & menonaktifkan lain dalam transaksi) | `DocumentSignerTest.php:58-93,95-144` | Sesuai | — |
| D11 | Nomor surat berurutan per tahun; nomor manual tetap dipakai | Sistem+Admin | `DocumentNumber.php:14-40` (increment di dalam transaksi `lockForUpdate`); `GenerateFreeResidenceLetter.php:46-47`; manual `PengajuanController.php:99,126` | `DocumentSignerTest.php:146-154` | Sesuai | — |
| D12 | QR berlogo Unand di blok TTD + halaman verifikasi publik per token | Sistem | `DocumentVerificationQr.php` (logo `unand-qr.png` terkompresi); `surat-bebas-asrama.blade.php:73-84`; `DocumentVerificationController.php:12-43`; `andalas.php:47`; perintah `documents:backfill-verification` untuk surat lama | `DocumentSignerTest.php:156-177,194-210`; `DocumentGenerationTest.php:110-116` | Sesuai | Surat lama dilengkapi token/nomor/signer/QR melalui command backfill. |

### E. Kerusakan, absensi, izin, aset, laundry/galon

| No | Ketentuan lampiran | Aktor | Implementasi (file:line) | Bukti uji | Status | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | Hanya penghuni aktif; pilih aset kamar/fasum gedungnya; deskripsi + 1–5 foto | Mahasiswa | `TiketController.php:20-47`; `CreateDamageReport.php:19,33-37`; `LaporanKerusakanPolicy.php:11-16` | `LaporanKerusakanLifecycleTest.php:60,76,154,171` | Sesuai | — |
| E2 | Laporan masuk ke Teknisi dan dashboard Pimpinan | Teknisi/Pimpinan | `RolePageController.php:455-461,106-112`; `LaporanKerusakanPolicy.php:18-25` | `BusinessProcessJourneyTest.php:78-87`; `DashboardTest.php` | Sesuai | — |
| E3 | Teknisi ambil, ubah status, selesai + catatan & foto | Teknisi | `TiketController.php:57-98`; `CompleteDamageReport.php:16-63` | `LaporanKerusakanLifecycleTest.php:86,101,117,206,219` | Sesuai | — |
| E4 | Dashboard pimpinan: menunggu / dikerjakan / selesai | Pimpinan | `DashboardEksekutif.tsx:120-145` (kunci `sedang_dikerjakan`); enum `LaporanKerusakanStatus.php:9` | `DashboardTest.php` | Sesuai | — |
| E5 | Binaan = lokal angkatan maba tahun pertama; yang checkout/re-entry bukan binaan | Mahasiswa | `AttendanceEligibility.php:10-16`; `ResidenceLifecycle.php:25-45` | `ActivityAttendanceTest.php:188-248` | Sesuai | — |
| E6 | Fasilitator buat kegiatan & sesi QR: waktu, titik, radius, **batas akurasi** | Fasilitator | `KegiatanController.php:25-26,57-58` (input `maximum_accuracy_meters` terpisah); `OpenAttendanceSession.php:65-66`; form `JadwalKegiatan.tsx` | `UnifiedActivityTest.php:44,65,73`; `ActivityAttendanceTest.php` | Sesuai | Bila dikosongkan, batas akurasi mengikuti radius. |
| E7 | Lokasi fasilitator aktif & dalam jangkauan sesi | Fasilitator | `RecordAttendanceAttempt.php:44-49`; `AbsensiController.php:78-94` | `ActivityAttendanceTest.php:111,222,259` | Sesuai | — |
| E8 | Mahasiswa pindai QR & kirim lokasi perangkat | Mahasiswa | `BarcodeAbsensi.tsx:66-95`; `AbsensiController.php:104-115` | `ActivityAttendanceTest.php:79,111` | Sesuai | — |
| E9 | Valid hanya jika token+waktu+2 lokasi+radius+akurasi terpenuhi | Sistem | `RecordAttendanceAttempt.php:36-53`; `AttendanceRejectionReason.php` | `ActivityAttendanceTest.php:92-177,274` | Sesuai | — |
| E10 | Fasilitator lihat riwayat & tutup sesi lebih awal; menu scan di akun binaan | Fasilitator/Mahasiswa | `AbsensiController.php:26-56,96-102`; `CloseAttendanceSession.php` | `ActivityAttendanceTest.php:177,287` | Sesuai | — |
| E11 | Menu Perizinan: jenis, periode, alasan, tujuan, kontak & dokumen opsional | Mahasiswa | `PerizinanController.php:19-56`; `PerizinanPanel.tsx:137-306` | `LeaveMonitoringTest.php:92` | Sesuai | — |
| E12 | ≤6 sebelumnya → langsung sedang izin; >6 → verifikasi fasilitator | Sistem/Fasilitator | `PerizinanController.php:42,48,58-77` | `LeaveMonitoringTest.php:41-48,57-71` | Sesuai | Ambang = jumlah sebelumnya > 6 (pengajuan ke-8 pertama butuh verifikasi). |
| E13 | Foto sampai → catat waktu/koordinat/akurasi → sudah sampai | Mahasiswa | `PerizinanController.php:79-111` | `LeaveMonitoringTest.php:73-90` | Sesuai | — |
| E14 | Foto kembali → catat waktu/koordinat/akurasi → sudah kembali | Mahasiswa | `PerizinanController.php:79-111`; `PengajuanIzinPulang.php:20-44` | `LeaveMonitoringTest.php:86-88` | Sesuai | — |
| E15 | Lokasi wajib; tidak mengklaim validasi isi foto AI | Sistem | `PerizinanController.php:86-89` | — | Sesuai | Sengaja tidak ada validasi konten foto (sesuai larangan). |
| E16 | Stok & aset keseluruhan: kode/nama/kategori/satuan/jumlah; stok ≥ ditempatkan; tak bisa hapus saat dipakai | Admin Aset | `StokAsetController.php:14-61` | `AssetInventoryWorkflowTest.php:40-83` | Sesuai | — |
| E17 | Aset per gedung/kamar; fasilitator hanya gedungnya; qty ≤ stok; impor Excel/CSV 1 sheet atomik; checklist checkout | Fasilitator/GO | `AsetController.php:41-160`; `CompleteCheckout.php:40-44` | `AssetInventoryWorkflowTest.php:85-159`; `CheckoutLifecycleTest.php:93-122` | Sesuai | — |
| E18 | Laundry & galon belum ada probis → tidak diaktifkan | — | Retire `2026_09_23_115718...:13-24,50-51`; permission `layanan.*` dihapus | `AssetInventoryWorkflowTest.php:161-178` | Sesuai | Tidak ada model/route/controller/UI. |

## Perbaikan yang dilakukan (26 September 2026)

1. **Dashboard pimpinan** — tambah `performance` (kinerja teknisi) dan `gedung_report` (penghuni aktif, kamar terisi/total, aset rusak per gedung) pada payload; dua tabel baru di `DashboardEksekutif.tsx`; kunci status grafik diperbaiki `diproses → sedang_dikerjakan` (`RolePageController.php`, `DashboardEksekutif.tsx`, `DashboardTest.php`).
2. **Tipe kamar** — satu kosakata `standar|medium|premium` di controller, UI, dan seeder; migrasi `reguler→standar`, `vip→premium` (`2026_09_26_090000_align_room_types_with_rates.php`).
3. **Penolakan "terdata alumni"** — pengajuan tanpa bukti dari pemohon yang terdata di arsip kini berstatus `ditolak` dengan pesan baku + invoice tetap ditampilkan; setelah tagihan lunas, surat terbit otomatis (`PengajuanController.php`, `PostPayment.php`, `ApproveFreeResidenceLetter.php`).
4. **Penandatangan** — `store` mengaktifkan penandatangan baru dan menonaktifkan yang lain dalam satu transaksi (invarian satu aktif).
5. **Nomor surat** — increment dilakukan di dalam transaksi `lockForUpdate` (aman dari duplikasi bersamaan).
6. **Kwitansi** — gedung/kamar/tipe memiliki fallback snapshot dan "Total dibayar" selalu tampil (`billing-document.blade.php`).
7. **Surat lama** — command baru `php artisan documents:backfill-verification` melengkapi token, penandatangan, nomor berurutan, dan QR pada surat lama; logo QR memakai `unand-qr.png` (78 KB) agar pembuatan QR ringan.
8. **Absensi** — input "Batas akurasi GPS (meter)" terpisah dari radius (`KegiatanController.php`, `JadwalKegiatan.tsx`).
9. **Checkout** — teks syarat kini menyebut sisa tagihan pribadi harus nol; test blokir utang ditambahkan (`CheckoutLifecycleTest.php`).
10. **Seeder** — sepuluh akun `fasilitator-<gedung>@example.test` ditugaskan ke 10 gedung riil; total akun skenario 73 (19 petugas + 54 client).

## Sisa catatan (tidak menghalangi kesesuaian)

- Kategori invoice hanya tersimpan sebagai JSON `residence_snapshot` (B4) — cukup untuk UI/laporan saat ini; kolom khusus bisa jadi pekerjaan lanjutan bila laporan kategori dipakai intensif.
- VA manual (B5) dan email `log` (D5) menunggu integrasi bank/SMTP; dicatat sebagai prasyarat lingkungan.
- Residu `jadwal_cicilan`/`termin_ke` dan status `Diproses`/`SiapCheckout` yang tak terpakai — pembersihan khusus bila diinginkan.
- Route `/admin/perizinan` untuk `staff_admin` bersifat read-only; item menu sudah disembunyikan sidebar.

## Konflik dengan PLAN.md (sisa)

| PLAN.md | Status | Bukti |
| --- | --- | --- |
| `:40` "Tolak jalur tersebut dan tampilkan tagihan belum lunas" | **Teratasi** — kini benar-benar ditolak + tagihan | `PengajuanController.php:81-99` |
| `:77` Kwitansi memuat kamar/tipe/gedung/durasi | **Teratasi** — fallback snapshot | `billing-document.blade.php:16-40` |
| `:64` Tipe kamar Standar/Medium/Premium | **Teratasi** — migrasi + kode | `2026_09_26_090000...php` |
| `:81` "Hilangkan pengajuan cicilan oleh mahasiswa" | Sebagian — tidak ada form pengajuan, entitas cicilan masih ada | `PembayaranController.php:35` |
| `:3` menautkan `AUDIT_KESESUAIAN_PROBIS.md` | Teratasi — file ini | dokumen ini |
| Summer Course / `EndTemporaryStays` | Catatan — tidak dibahas PLAN, nyata di kode | `routes/console.php:14` |

## Prasyarat teknis & batasan yang harus dipahami penguji

- **Worker antrean wajib** untuk PDF & notifikasi: `php artisan queue:work` (lokal) atau konfigurasi container.
- **Scheduler wajib** untuk pengakhiran hunian sementara otomatis: `php artisan schedule:work` (lokal) atau cron `schedule:run`.
- **Mailer `log` tidak mengirim ke inbox**; email surat baru tercatat di log. Untuk inbox nyata, atur SMTP.
- **Virtual Account bersifat manual** (record internal + verifikasi admin), bukan integrasi bank.
- **QR absensi & bukti izin memerlukan izin lokasi + kamera** dan konteks aman (HTTPS) untuk akses lintas perangkat.
- **PDF surat** dibuat oleh job `GenerateFreeResidenceLetter`; template versi `residence-snapshot-v4`.
- **Surat lama** dilengkapi lewat `php artisan documents:backfill-verification` (token, nomor, penandatangan, QR).
- **Pemeriksaan perangkat/email/bank nyata belum dilakukan** → berstatus belum terverifikasi.

## Verifikasi yang dijalankan

| Perintah | Hasil |
| --- | --- |
| `php artisan test --compact` | 297 test, 294 lulus, 3 skipped, 0 gagal (`memory_limit` testing dinaikkan ke 512M untuk render PDF/QR) |
| `npx vp test --config vitest.config.ts` | 21 file, 67 test lulus |
| `npm run types:check` (`tsc --noEmit`) | bersih |
| `vendor/bin/pint --dirty --format agent` | lulus |

Test yang menjadi bukti utama: `ActorAccessMatrixTest`, `RolePermissionMatrixTest`, `ClientAccountRegistrationTest`, `ResidenceRegistrationWorkflowTest`, `BillingFoundationTest`, `FinancialLedgerIntegrityTest`, `TemporaryStayTest`, `CheckoutLifecycleTest`, `CheckoutEndpointTest`, `FreeResidenceLetterLifecycleTest`, `DocumentGenerationTest`, `DocumentSignerTest`, `DashboardTest`, `LaporanKerusakanLifecycleTest`, `ActivityAttendanceTest`, `LeaveMonitoringTest`, `AssetInventoryWorkflowTest`, `ComprehensiveSeederTest`, `BusinessProcessJourneyTest`.

## Pekerjaan lanjutan (opsional, tidak menghalangi lampiran)

1. Kolom kategori invoice terstruktur bila laporan kategori dipakai intensif.
2. Integrasi provider VA + SMTP produksi.
3. Pembersihan residu: `jadwal_cicilan`/`termin_ke`, status checkout tak terpakai.
4. Test endpoint `residence-management` (building/rate) dan E2E S2/S3 memilih kamar.
