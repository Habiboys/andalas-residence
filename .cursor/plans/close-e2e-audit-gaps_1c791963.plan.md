---
name: close-e2e-audit-gaps
overview: Audit ulang menemukan sejumlah flow yang sebelumnya dinyatakan selesai masih partial, terutama wiring UI Inertia, billing terpadu, inspeksi checkout, bebas asrama, QR-geofence, dan seed data operasional. Rencana ini menutup blocker runtime terlebih dahulu lalu menyelesaikan tiap journey dengan test HTTP/Inertia dan seed scenario yang dapat langsung dipakai.
todos:
  - id: fix-role-runtime
    content: Fix missing imports, role layouts, page aliases, navigation, and missing operational Inertia components.
    status: completed
  - id: unify-registration-billing
    content: Complete server-authoritative registration through invoice, installments, VA, payment, and detailed receipt.
    status: completed
  - id: complete-checkout-operations
    content: Implement GO inspection findings/photos, asset and finance clearance queues, and facilitator completion UI.
    status: completed
  - id: complete-free-residence
    content: Implement cohort tariffs, legacy verification evidence, arrears billing/VA, modern checkout linkage, document delivery, and deactivation.
    status: completed
  - id: complete-damage-ui
    content: Connect report photos, technician assignment/completion evidence, status history, leadership detail, and private downloads.
    status: completed
  - id: complete-attendance-ui
    content: Implement facilitator-location validation, session ownership/activity bounds, QR UI, student scan/geolocation, and attendance history.
    status: completed
  - id: seed-role-scenarios
    content: Make role seeding ordered/idempotent and add accurate demo accounts plus useful operational scenarios for every module.
    status: completed
  - id: verify-e2e-journeys
    content: Add HTTP/Inertia journey tests and run migration, seed, Pint, Wayfinder, TypeScript, build, targeted, and full-suite verification.
    status: completed
isProject: false
---

# Penyelesaian Gap End-to-End Hasil Audit Ulang

## Temuan utama
- Pendaftaran memiliki backend tetapi halaman berisiko gagal karena import model hilang; review Admin Layanan dan billing baru belum tersambung penuh ke pembayaran/UI.
- Checkout memiliki action finalisasi, tetapi page GO/Admin Aset/Admin Layanan/Fasilitator belum lengkap; finding/checklist/foto inspeksi belum dapat diinput.
- Bebas asrama memiliki action dan PDF, tetapi input jalur legacy, rekening koran, tarif per angkatan, invoice/VA tunggakan, linkage checkout modern, download dokumen, dan deaktivasi akun belum lengkap.
- Pelaporan kerusakan memiliki domain lifecycle kuat, tetapi upload frontend, penyelesaian teknisi, assignment/history, dan bukti privat belum tersambung penuh.
- Absensi memiliki validasi geofence mahasiswa, tetapi UI QR/scan belum ada, permission mahasiswa salah, ownership fasilitator belum enforced, dan lokasi fasilitator belum divalidasi terhadap lokasi kegiatan.
- Akun semua aktor utama sudah seeded, tetapi urutan role seeding, daftar demo, component/layout role baru, dan data operasional tiap modul masih tidak lengkap.

## Implementasi
1. **Perbaiki blocker runtime dan matriks role**
   - Tambahkan import model yang hilang pada [`app/Http/Controllers/RolePageController.php`](app/Http/Controllers/RolePageController.php).
   - Lengkapi resolver layout di [`resources/js/app.tsx`](resources/js/app.tsx), page map, route aliases, dan sidebar untuk `admin_layanan`, `admin_aset`, `go`, dan `orang_tua`.
   - Buat page yang dirujuk route tetapi belum ada: review registrasi, inspeksi checkout, clearance aset/keuangan, dan approval checkout.

2. **Satukan registrasi dan billing**
   - Jadikan kategori profil server-side sebagai sumber KIPK/gratis; jangan percaya checkbox client.
   - Hubungkan registrasi ke `tagihan`, cicilan, virtual account, `PostPayment`, invoice, dan kuitansi; hentikan ketergantungan flow ini pada jalur pembayaran legacy.
   - Tampilkan invoice, tagihan aktif, nominal VA, cicilan, status pembayaran, dan kuitansi berisi kamar/tipe/gedung/masa tinggal pada halaman client dan admin.

3. **Selesaikan checkout multi-aktor**
   - Tambahkan Form Request/action untuk checklist, findings, severity, estimasi biaya, dan foto privat pada inspeksi GO.
   - Hubungkan finding ke laporan kerusakan dan tampilkan hasilnya.
   - Sediakan queue clearance aset dan keuangan; outstanding dihitung dari tagihan aktual.
   - Enforce finalisasi fasilitator serta persistence placement/client/room secara atomik.

4. **Selesaikan bebas asrama**
   - Tambahkan konfigurasi tarif per angkatan dan UI admin.
   - Lengkapi form mahasiswa untuk bukti pembayaran, rekening koran, dan bukti kelulusan.
   - Lengkapi verifikasi admin untuk jalur `alumni_paid`, `alumni_unpaid`, dan `non_resident`; otomatis kaitkan checkout untuk angkatan 2026+.
   - Untuk tunggakan, buat invoice/VA dan lanjutkan approval saat pembayaran lunas.
   - Sinkronkan path dokumen hasil job dengan download UI, kirim notification/email, dan nonaktifkan user setelah surat berhasil diterbitkan.

5. **Selesaikan pelaporan kerusakan**
   - Tambahkan upload foto awal pada page client dan bukti selesai pada page teknisi.
   - Tambahkan assignment/claim, metode penanganan, biaya riil, cancellation action, history, dan authorized private evidence download.
   - Tampilkan laporan milik client serta detail aktif/selesai pada teknisi dan pimpinan.

6. **Selesaikan absensi QR-geofence**
   - Tambahkan koordinat resmi kegiatan dan rekaman posisi/akurasi fasilitator; validasi fasilitator berada dalam radius lokasi kegiatan saat membuka sesi.
   - Enforce ownership sesi, batas waktu kegiatan, target/participant, locking saat record, strict kategori lokal angkatan 2026, dan permission scan mahasiswa.
   - Buat UI fasilitator untuk open/render QR, expiry, history, dan close; buat UI mahasiswa untuk scan/token, browser geolocation, hasil validasi, dan history.

7. **Benahi akun demo dan seed data**
   - Jalankan [`database/seeders/RolePermissionSeeder.php`](database/seeders/RolePermissionSeeder.php) sebelum `syncRoles`, buat `DatabaseSeeder` idempotent, dan sinkronkan daftar demo frontend dengan akun sebenarnya.
   - Lengkapi manajemen akun internal untuk semua role termasuk orang tua.
   - Seed scenario koheren per modul: registrasi gratis/berbayar, invoice/VA/cicilan, placement aktif, kegiatan/absensi, tiket teknisi, bebas asrama, service orders, checkout/clearance, dan laporan pimpinan.

8. **Verifikasi akhir berbasis journey**
   - Tambahkan Pest feature tests pada boundary HTTP/Inertia untuk tiap aktor, upload privat, authorization, props, redirect, transaksi, dan failure paths.
   - Jalankan migration fresh/seed smoke test, migration status, Pint, Wayfinder, TypeScript, build, targeted tests, dan full suite.
   - Audit ulang setiap butir proses bisnis dan hanya tandai `implemented` bila journey bisa dijalankan dari UI sampai persistence/output final.