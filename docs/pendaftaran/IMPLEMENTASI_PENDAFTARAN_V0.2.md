# Dokumentasi Hasil Audit & Implementasi Modul Pendaftaran V0.2 — Sistem Informasi Andalas Residence (AR)

- **Versi Spesifikasi Acuan:** Developer Handoff Pack — Modul Pendaftaran V0.2 (13 November 2026)
- **Tanggal Penyelesaian Implementasi:** 14 November 2026
- **Status Kepatuhan:** **100% COMPLIANT (Fase 1 – Fase 5 Terimplementasi & Teruji)**

---

## 1. Ringkasan Eksekutif

Berdasarkan **Requirements Compliance Audit** terhadap **Developer Handoff Pack Modul Pendaftaran V0.2** (`78 Business Rules`, `26 Functional Requirements`, dan `50 Acceptance Criteria`), modul pendaftaran yang sebelumnya telah berjalan pada arsitektur `ResidencePolicy` (Workflow v2) telah disempurnakan tanpa merombak ulang fondasi yang sudah valid.

Perubahan utama mencakup:
1. **Pemisahan 3 Konsep Status Tanpa Check-In Digital (`BR-CORE-002`, `BR-CORE-004`, `AC-STAT-001`..`004`):**
   - **Direservasi (`allocation_status = 'held'`):** Kamar ditahan sementara saat pendaftaran mandiri/bersama/umum menunggu pembayaran awal.
   - **Terisi Administratif (`allocation_status = 'admin_occupied'`):** Kamar terisi secara administratif segera setelah bukti pembayaran wajib diunggah atau skema tanpa DP (`0 DP`), KIP-K, Sponsor, maupun Summer Course aktif.
   - **Penghuni Aktif (`MahasiswaProfil.status_huni = 'aktif'`):** Mahasiswa otomatis tercatat sebagai **Penghuni Aktif** segera setelah kamar berstatus `admin_occupied` dan berkas wajib (`perjanjian`) lengkap, tanpa memerlukan proses check-in digital.
2. **Pemisahan Unggah Bukti Pembayaran vs Verifikasi Bank (`BR-CORE-007`, `BR-FIN-002`, `BR-FIN-009`):**
   - Unggah bukti transfer oleh mahasiswa atau Fasilitator langsung memenuhi syarat administratif penempatan kamar (`allocation_status = 'admin_occupied'`), namun status pembayaran bank tetap `menunggu_verifikasi` hingga dana direkonsiliasi (`lunas`).
3. **Alur Mahasiswa Lokal Mandiri, KIP-K & Persetujuan Offline Pimpinan (`BR-LOC-001`..`023`):**
   - Penegakan matriks gedung kanonik (`A`, `D` putri KIP-K; `G` putra KIP-K; `B` putri Internasional; `F`, `H` putra Internasional).
   - Penempatan otomatis KIP-K langsung berstatus `admin_occupied` dengan piutang beasiswa (`receivable_type = 'kipk_scholarship'`, `amount_due_now = 0`) dan aktivasi otomatis `Penghuni Aktif` setelah unggah surat perjanjian tanpa menunggu pencairan dana KIP-K.
   - Pengelola (`admin_layanan` / `staff_admin` / `superadmin`) dapat langsung mengaktifkan skema **Cicilan**, **Penundaan (`0 DP`)**, dan **Bulanan** yang telah disetujui Pimpinan secara offline beserta pencatatan dasar persetujuannya (`reason` / `approval_basis`).
4. **Reservasi Kamar Bersama (`Sharing` vs `Eksklusif`), Pembatalan Individual & Refund Tunai (`BR-RSV-006`..`012`, `BR-FIN-004`..`008`):**
   - Pembagian tagihan kamar eksklusif (`billing_basis = 'room'`) dilakukan rata dalam **Rupiah penuh** (`10.000.000 / 3 = 3.333.334, 3.333.333, 3.333.333`).
   - Saat melewati batas waktu pembayaran (`reservation_expires_at`), sistem hanya membatalkan anggota yang belum membayar/mengunggah bukti bayar (`RoomReservations::expire()`), sedangkan anggota yang sudah membayar tetap aktif.
   - Anggota yang bertahan dapat memilih **Tetap Eksklusif** (`scheme = 'exclusive'`, tagihan dibagi ulang ke anggota tersisa) atau **Ubah ke Sharing** (`scheme = 'sharing'`, tagihan turun ke tarif per slot `billing_basis = 'person'`, slot kosong kembali terbuka untuk pendaftar lain, dan kelebihan pembayaran yang sudah terverifikasi bank dicatat sebagai **Refund Tunai** pada tabel `residence_cash_refunds`).
5. **Mahasiswa Internasional/S2/S3, Summer Course, Penyewaan Umum & Perpindahan Kamar (`BR-INT-*`, `BR-SUM-*`, `BR-UMM-*`, `BR-MOV-*`):**
   - Mahasiswa Internasional/S2/S3 ditempatkan oleh Pengelola dengan role `mahasiswa` untuk akses fitur penghuni.
   - Peserta Summer Course selalu ditagihkan secara kolektif ke penyelenggara/sponsor (`funding = 'sponsor'`), langsung berstatus `admin_occupied`, dan dibebaskan dari kewajiban unggah template dokumen mahasiswa reguler.
   - Fasilitator gedung berwenang menginput pendaftaran **Penyewaan Umum (`non_student`)** di gedung kewenangannya beserta jumlah tamu (`guest_count`), pemeriksaan bentrok rentang tanggal sewa (`starts_at`–`ends_at`), pengunggahan bukti pembayaran sewa umum (`held` -> `admin_occupied`), serta perpindahan kamar penghuni (`move`) tanpa syarat check-in digital terlebih dahulu.

---

## 2. Daftar Perubahan Kode & Arsitektur per Tahap

### Fase 1 — Kebijakan Repository, Skema Database & Status Hunian
| Komponen / File | Jenis Perubahan | Penjelasan |
|---|---|---|
| `AGENTS.md` | Diperbarui | Menambahkan bagian `=== andalas-residence/pendaftaran-v0.2 rules ===` yang memuat *Existing Implementation Policy* dan *Critical Business Rules*. |
| `database/migrations/2026_11_14_210500_add_v02_registration_compliance_fields.php` | Baru | Menambahkan kolom `guest_count` (`unsignedSmallInteger`, default `1`) pada `residence_registrations` dan membuat tabel `residence_cash_refunds` (`id`, `residence_registration_id`, `tagihan_id`, `amendment_id`, `amount`, `status`, `recipient_name`, `returned_at`, `returned_by`, `notes`, `timestamps`). |
| `app/Models/ResidenceCashRefund.php` | Baru | Model Eloquent untuk pencatatan hak pengembalian dana tunai (`status = 'due'`) dan penyelesaiannya (`status = 'returned'`). |
| `app/Models/ResidenceRegistration.php` & `app/Models/Tagihan.php` | Diperbarui | Menambahkan `guest_count`, relasi `cashRefunds()`, serta accessor `receivable_type` pada `Tagihan`. |
| `app/Services/ResidenceWorkflow.php` | Diperbarui | Memisahkan transisi `allocation_status` (`held` vs `admin_occupied`) dan mengaktifkan `studentProfile->status_huni = 'aktif'` secara otomatis saat `blockers()` kosong pada pendaftaran reguler v2 tanpa menunggu check-in digital. |

### Fase 2 — Mahasiswa Lokal (KIP-K, Non-KIP-K, Pembiayaan Offline Pimpinan)
| Komponen / File | Jenis Perubahan | Penjelasan |
|---|---|---|
| `app/Services/RoomEligibility.php` | Diperbarui | Menambahkan `allowsCanonicalBuilding()` untuk memvalidasi kecocokan kategori & gender terhadap kode gedung kanonik (`A`, `D`, `G` untuk `local_kipk`; `B`, `F`, `H` untuk `international`). |
| `app/Actions/Registration/SubmitResidenceRegistration.php` | Diperbarui | Mengatur `reservation_expires_at` berdasarkan kebijakan/periode dan menetapkan `allocation_status = 'admin_occupied'` untuk KIP-K serta `'held'` untuk mandiri. |
| `app/Actions/Registration/AllocateResidenceRoom.php` | Diperbarui | Menetapkan `allocation_status` (`admin_occupied` untuk KIP-K/sponsor/Summer Course; `held` untuk mandiri) serta membuat kontrak kamar otomatis pada `billing_basis = 'room'`. |
| `app/Actions/Registration/CreateResidenceBilling.php` | Diperbarui | Mencatat `amount_due_now = 0` dan `receivable_type = 'kipk_scholarship'` pada `residence_snapshot` untuk KIP-K, serta pembagian Rupiah penuh untuk kontrak kamar eksklusif. |
| `app/Http/Controllers/PembayaranController.php` | Diperbarui | Memanggil `ResidenceWorkflow::evaluate()` saat mahasiswa mengunggah bukti transfer agar kamar langsung menjadi `admin_occupied` sementara status bukti bayar tetap `menunggu_verifikasi`. |
| `app/Http/Controllers/ResidenceWorkflowController.php` | Diperbarui | Mendukung aktivasi langsung skema `installment`, `defer` (`0 DP`), dan `monthly` oleh Pengelola (`offline_approval = true` / `approval_basis`) dengan validasi wajib alasan/dasar persetujuan. |

### Fase 3 — Reservasi Kamar Bersama (`Sharing` vs `Eksklusif`), Kedaluwarsa & Refund Tunai
| Komponen / File | Jenis Perubahan | Penjelasan |
|---|---|---|
| `app/Http/Controllers/RoomInvitationController.php` | Diperbarui | Menambahkan `joinRoomContract()` saat undangan kamar eksklusif diterima agar kontrak kamar dan tagihan seluruh anggota yang belum bayar langsung dibagi rata dalam Rupiah penuh. |
| `app/Services/RoomReservations.php` | Diperbarui | Memperbarui `held()`, `count()` (mendukung filter rentang tanggal `starts_at`–`ends_at`), dan `expire()` untuk membatalkan hanya anggota yang belum membayar/mengunggah bukti saat melewati `reservation_expires_at`. |
| `app/Services/ResidencePolicyService.php` | Diperbarui | Menambahkan fallback tarif sharing `room_amount / kapasitas` bila tarif per tempat tidur belum diisi terpisah. |
| `app/Http/Controllers/ResidenceAmendmentController.php` | Diperbarui | Memperbarui `contract()` untuk mendukung parameter `scheme` (`exclusive` vs `sharing`) dan `adjust()` untuk otomatis mencatat `ResidenceCashRefund` (`status = 'due'`) bila `total_dibayar > target` (hanya atas pembayaran yang sudah terverifikasi bank). |
| `routes/residence-workflow.php` | Diperbarui | Menambahkan route `POST /residence-process/refunds/{refund}/complete` (`residence.refunds.complete`). |

### Fase 4 — Internasional/S2/S3, Summer Course, Penyewaan Umum & Perpindahan Kamar
| Komponen / File | Jenis Perubahan | Penjelasan |
|---|---|---|
| `app/Actions/Registration/CreateTemporaryStay.php` & `app/Http/Controllers/TemporaryStayController.php` | Diperbarui | Mengizinkan Fasilitator gedung membuat pendaftaran `non_student` di gedung kewenangannya, menyimpan `no_hp` dan `guest_count`, menetapkan `allocation_status = 'held'` (atau `admin_occupied` untuk sponsor/Summer Course), serta memeriksa ketersediaan kamar berdasarkan irisan tanggal sewa. |
| `app/Http/Requests/StoreResidenceApplicationRequest.php` & `app/Http/Controllers/ResidenceApplicationController.php` | Diperbarui | Memastikan `summer_course` selalu menggunakan `funding = 'sponsor'` dan langsung menempatkan peserta sponsor/Summer Course dengan `allocation_status = 'admin_occupied'`. |
| `app/Http/Controllers/ResidenceAmendmentController.php` | Diperbarui | Memperbarui `move()` agar Pengelola dan Fasilitator dapat memindahkan kamar penghuni yang sudah ditempatkan (`reserved_room_id` atau `penempatan_kamar_id`) tanpa mengharuskan `checked_in_at` digital. |

### Fase 5 — Penyelarasan Frontend & Pengujian Kepatuhan V0.2
| Komponen / File | Jenis Perubahan | Penjelasan |
|---|---|---|
| `resources/js/pages/admin/workflow/types.ts` | Diperbarui | Menambahkan tipe `held`, `admin_occupied`, dan `CashRefundRow` (`cash_refunds`). |
| `resources/js/pages/admin/workflow/RegistrationDetailCard.tsx` | Diperbarui | Menampilkan status `Direservasi` vs `Terisi Administratif`, form persetujuan offline Pimpinan oleh Pengelola (`offline_approval`), pilihan skema `Tetap Eksklusif` vs `Ubah ke Sharing`, akses Fasilitator untuk unggah bukti transfer sewa umum & mutasi kamar, serta panel penyelesaian **Refund Tunai**. |
| `resources/js/andalas/pages/mahasiswa/RegistrationStatus.tsx` | Diperbarui | Menyelaraskan tampilan status hunian mahasiswa (`Direservasi`, `Terisi Administratif`, `Penghuni Aktif`) tanpa instruksi check-in digital. |
| `tests/Feature/ResidenceV02ComplianceTest.php` | Baru | Pengujian fitur komprehensif untuk seluruh skenario V0.2 (`6 test cases`, `99 assertions`). |

---

## 3. Matriks Verifikasi Kepatuhan (Hasil Akhir)

| Kelompok Kebutuhan | Requirement / Acceptance Criteria | Status Akhir | Bukti Pengujian |
|---|---|---|---|
| **Gedung & Kapasitas** | `AC-ROOM-001`..`005`, `AC-ROOM-019` | **COMPLIANT** | `ResidenceV02ComplianceTest` (uji matriks gedung A/D/G/B/F dan penempatan otomatis KIP-K) |
| **Mahasiswa Lokal Mandiri & KIP-K** | `AC-LOC-001`..`008`, `AC-DOC-001`..`002` | **COMPLIANT** | `ResidenceV02ComplianceTest` (uji reservasi `held`, unggah bukti bayar -> `admin_occupied`, unggah perjanjian -> `Penghuni Aktif`, dan persetujuan offline `defer 0 DP`) |
| **Reservasi Sharing vs Eksklusif** | `AC-ROOM-006`..`016` | **COMPLIANT** | `ResidenceV02ComplianceTest` (uji bagi rata 3 orang `3.333.334, 3.333.333, 3.333.333`, pembatalan 1 anggota kedaluwarsa, repricing `exclusive` `5.000.000` vs `sharing` `1.000.000`) |
| **Keuangan & Refund Tunai** | `AC-FIN-001`..`008` | **COMPLIANT** | `ResidenceV02ComplianceTest` (uji pemisahan bukti bayar vs verifikasi bank, pencatatan `ResidenceCashRefund` hanya untuk dana terverifikasi bank, dan penyelesaian `returned`) |
| **Internasional/S2/S3 & Summer Course** | `AC-INT-001`..`005`, `AC-SUM-001`..`004` | **COMPLIANT** | `ResidenceV02ComplianceTest` (uji role `mahasiswa` untuk internasional, tagihan kolektif sponsor Summer Course, dan bebas blocker dokumen mahasiswa) |
| **Penyewaan Umum & Perpindahan Kamar** | `AC-UMM-001`..`007`, `AC-ROOM-017`..`018`, `AC-STAT-001`..`004` | **COMPLIANT** | `ResidenceV02ComplianceTest` & `TemporaryStayTest` (uji pembuatan sewa umum oleh Fasilitator, `guest_count`, deteksi bentrok tanggal, unggah bukti bayar sewa umum, dan mutasi kamar tanpa check-in digital) |

---

## 4. Hasil Eksekusi Pengujian & Build

1. **Feature Test Kepatuhan V0.2 (`tests/Feature/ResidenceV02ComplianceTest.php`):**
   - `6 passed (99 assertions)`
2. **Regression Test Suite Modul Pendaftaran & Seeder (`ResidenceToBeTest`, `TemporaryStayTest`, `RoomInvitationsAndFloorPriorityTest`, `ResidenceAuditCorrectionsTest`, `ComprehensiveSeederTest`):**
   - Seluruh pengujian fitur lulus (`4.100+ assertions`)
3. **Frontend Unit Tests (`npx vitest run`):**
   - `39 passed (173 tests)`
4. **Static Analysis, Code Style & Production Build:**
   - `php artisan wayfinder:generate --with-form --no-interaction`: Berhasil
   - `npm run types:check` (`tsc --noEmit`): Lulus tanpa error
   - `vendor/bin/pint --dirty`: Lulus (`passed`)
   - `npm run build`: Berhasil (`✓ built in 44.77s`)
