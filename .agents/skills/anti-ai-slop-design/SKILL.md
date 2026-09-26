---
name: anti-ai-slop-design
description: Gunakan skill ini SETIAP kali membuat UI baru (landing page, dashboard, halaman marketing, hero section) ATAU saat diminta mengaudit/refactor/de-slop tampilan yang sudah ada. Mencegah dan memperbaiki "AI slop" — pola visual, struktural, dan konten yang bikin hasil AI terlihat generik/template. Wajib dibaca SEBELUM menulis kode UI, bukan hanya saat diminta audit eksplisit.
---

# Anti-AI-Slop Design

AI slop bukan masalah selera, tapi masalah statistik: tanpa constraint yang jelas, model menyamplekan pilihan visual paling "rata-rata" dari data training — hasilnya semua UI buatan AI terlihat sama. Melarang token tertentu saja ("jangan ungu", "jangan Inter") cuma menggeser puncak distribusi ke default lain yang sama generiknya. Fix yang bertahan lama adalah memaksa **kespesifikan** di awal (Mode A), lalu mengaudit hasil di tiga layer sekaligus (Mode B) — bukan cuma layer warna.

## Mode A — Sebelum Membuat UI Baru

Sebelum menulis kode landing page/dashboard/hero baru, kalau konteksnya belum jelas, tanyakan dulu (atau ambil dari konteks yang sudah ada — brand guide, kode existing, referensi yang disebut user):

1. **Identitas visual** — ada brand guide/warna/font/logo yang harus diikuti? Kalau tidak ada, ini kesempatan menentukan satu arah visual yang spesifik, bukan default netral.
2. **Referensi** — ada situs/produk yang gaya visualnya disukai (atau justru dihindari) sebagai acuan?
3. **Poin pembeda utama** — satu hal yang harus langsung terlihat beda dari kompetitor/produk sejenis (bukan "modern dan clean" — itu tidak spesifik).
4. **Konten nyata** — ada copy/data/gambar produk asli yang bisa dipakai? Kalau belum ada, tandai sebagai placeholder yang jelas, jangan isi dengan visual abstrak yang menipu (lihat C4).

Kalau user tidak menjawab dan minta langsung jalan, buat asumsi paling spesifik yang masuk akal (bukan yang paling aman/netral) dan sebutkan asumsinya.

## Mode B — Audit 3 Layer (untuk UI baru maupun refactor)

Urutan audit: **Visual → Struktural → Konseptual**. Layer struktural dan konseptual biasanya dampaknya lebih besar daripada visual, tapi visual paling gampang dikenali — cek semua, lalu prioritaskan perbaikan berdasarkan dampak nyata, bukan yang paling gampang dikerjakan.

### Layer 1 — Visual

Semua styling (warna, radius, spacing, font weight, shadow) harus bersumber dari **design token** terpusat (Tailwind v4: `@theme` di CSS; Tailwind v3/lain: config atau CSS variables), bukan nilai acak per komponen. Font default disepakati eksplisit di awal project (misal **DM Sans** — bukan Inter/font default framework tanpa dipikir).

Hindari pola berikut kecuali ada alasan fungsional jelas:

| #   | Pola                               | Penjelasan                                                                                                                                                                                       |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| V1  | Gradient/glow di mana-mana         | Tombol dengan glow/shadow warna-warni atau gradasi background sebagai default semua CTA. Primary button cukup solid dari token warna, gradasi hanya kalau memang identitas brand yang disengaja. |
| V2  | Tidak ada hierarki tipografi       | Bold dipakai di banyak elemen sekaligus (judul, label, angka, deskripsi semua bold) sehingga tidak ada yang benar-benar menonjol.                                                                |
| V3  | Gradient text pada headline        | Judul besar dengan gradient fill sebagai "gaya default" tanpa makna.                                                                                                                             |
| V4  | Radius seragam kebesaran           | Semua card/tombol pakai radius paling besar (`xl`/`2xl`/`3xl`/`full`) tanpa skala. Tentukan satu radius dasar dari token, konsisten.                                                             |
| V5  | Icon stamp warna-warni             | Icon ditaruh di kotak/lingkaran background warna-warni (biru, ungu, hijau bergantian) di tiap card/list-item tanpa makna semantik. Warna icon ikut token semantic.                               |
| V6  | Drop shadow & hover di mana-mana   | Shadow dan efek hover (scale/lift/translate) otomatis di semua card, termasuk card statis/display yang tidak clickable. Hover hanya untuk elemen actionable.                                     |
| V7  | Blob dekoratif                     | Bentuk blur/blob warna-warni sebagai background dekorasi tanpa fungsi.                                                                                                                           |
| V8  | Glassmorphism                      | `backdrop-blur` + transparansi + border putih tipis ala kaca dipakai sebagai default. Ganti background solid dari token atau shadow tipis kalau butuh elevasi.                                   |
| V9  | Ilustrasi 3D clay generik          | Ilustrasi gaya "3D clay/blob figure" generik yang tidak merepresentasikan produk sebenarnya.                                                                                                     |
| V10 | Border tipis warna-warni per card  | Border beda warna tiap card sebagai dekorasi. Pembeda status pakai badge/warna teks bermakna, bukan border dekoratif.                                                                            |
| V11 | Underline dekoratif di bawah judul | Garis/accent line otomatis di bawah tiap heading section sebagai "hiasan". Heading cukup dibedakan lewat ukuran & weight dari token.                                                             |
| V12 | Badge nempel di atas judul hero    | Badge kecil ("New", "✨ Powered by X") otomatis di atas hero tanpa informasi nyata. Tambahkan hanya kalau memang ada info valid (promo/status aktual).                                           |

### Layer 2 — Struktural (susunan halaman)

Layer ini soal **kerangka halaman**, bukan warna — sering jadi ciri paling kentara meski warnanya sudah diganti-ganti:

| #   | Pola                       | Penjelasan                                                                                                                                                       |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Hero SaaS kanonik          | Judul besar generik + subjudul + dua tombol (primary/secondary) + gradient blob di belakang, formula yang sama persis di hampir semua landing page AI-generated. |
| S2  | Grid 3 fitur dengan icon   | Section fitur selalu 3 kolom, tiap kolom icon + judul pendek + 1 kalimat, tanpa variasi kedalaman info.                                                          |
| S3  | Logo soup                  | Baris logo "dipercaya oleh" perusahaan besar yang ditempel tanpa konteks/relasi nyata.                                                                           |
| S4  | Testimonial carousel palsu | Slider testimoni dengan foto stok/nama generik, tidak terasa seperti kutipan nyata.                                                                              |
| S5  | Bento grid tanpa alasan    | Grid kotak-kotak ukuran beda-beda (gaya "bento") dipakai default padahal konten tidak butuh struktur itu.                                                        |
| S6  | Semua section seragam      | Tiap section punya padding/lebar/pola layout yang identik dari atas sampai bawah, halaman terasa monoton meski scroll panjang.                                   |
| S7  | Sidebar dashboard generik  | Sidebar admin dengan susunan menu template (Dashboard, Analytics, Settings, ...) tanpa disesuaikan domain aplikasi sebenarnya.                                   |
| S8  | Baris 4 KPI card           | Dashboard selalu buka dengan 4 card angka besar di atas tanpa mempertimbangkan apakah 4 metrik itu memang yang paling penting.                                   |
| S9  | Chart dekoratif            | Grafik ditaruh untuk "kelihatan analitis" padahal datanya tidak representatif/tidak dibaca siapa pun.                                                            |

### Layer 3 — Konseptual (isi/copy)

Layer ini soal **substansi konten**, sering paling menentukan apakah produk terasa nyata atau generik:

| #   | Pola                            | Penjelasan                                                                                                                                         |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Headline aspirasional kosong    | "Unlock your potential", "Empower your team" — terdengar inspiratif tapi tidak bilang produk ini benar-benar apa.                                  |
| C2  | Verb slop                       | Kata kerja generik berulang: "Streamline", "Empower", "Elevate", "Supercharge", "Transform" tanpa spesifik apa yang di-streamline.                 |
| C3  | Section generik tanpa isi nyata | "Why choose us", "Our features" berisi klaim umum yang bisa dipakai produk apa saja, tidak spesifik ke produk ini.                                 |
| C4  | Visual demo abstrak             | Screenshot/mockup produk yang isinya data placeholder acak, tidak menunjukkan use case nyata.                                                      |
| C5  | Tidak ada sudut pandang         | Copy terasa netral/aman, tidak berani punya opini atau posisi yang membedakan dari kompetitor.                                                     |
| C6  | Kespesifikan palsu              | Angka/statistik terdengar presisi ("47% lebih cepat") tapi tidak ada sumber/konteks nyata di baliknya.                                             |
| C7  | State fungsional hilang         | UI cuma menunjukkan "happy path" — tidak ada desain untuk empty state, loading state, error state, padahal itu yang sering dialami user sungguhan. |

## Prinsip Pengganti (berlaku di semua layer)

- Pilih **satu** elemen yang boleh menonjol per halaman/section — jangan semua elemen (warna, animasi, badge, gradient) bersaing menonjol sekaligus.
- Default-nya **jangan tambahkan** efek/struktur/klaim kecuali ada alasan fungsional atau konten nyata di baliknya.
- Kespesifikan mengalahkan kehati-hatian: satu keputusan visual/struktural/konten yang tegas dan spesifik ke produk ini lebih baik daripada opsi "aman" yang bisa dipakai produk apa saja.

## Alur Kerja Audit (Mode B)

1. **Scan dulu, jangan langsung edit** — list semua pelanggaran yang ketemu, kelompokkan per layer (Visual/Struktural/Konseptual) dan per kode pola (V1, S3, C2, dst).
2. **Urutkan berdasarkan dampak**, bukan kemudahan — pelanggaran struktural/konseptual biasanya dampaknya lebih besar ke kesan "generik" daripada sekadar ganti warna, meski warna paling gampang dikenali duluan.
3. **Refactor komponen reusable dulu** (`components/ui/`, `components/common/`) supaya perbaikan otomatis menyebar ke semua tempat yang memakainya, baru turun ke komponen spesifik halaman.
4. **Re-audit setelah selesai** — cek ulang ketiga layer, pastikan tidak ada pola yang masih nempel atau malah muncul pola baru sebagai "pengganti" (misal ganti gradient ungu jadi gradient navy — tetap V1).

## Checklist Cepat

- [ ] Font & warna eksplisit dari token, bukan default framework
- [ ] Tidak ada V1-V12 (lihat tabel Visual) tanpa alasan fungsional
- [ ] Struktur halaman tidak 1:1 mengikuti pola S1-S9 tanpa modifikasi yang disengaja
- [ ] Copy dicek terhadap C1-C7 — ada substansi nyata, bukan klaim generik
- [ ] Ada desain untuk empty/loading/error state, bukan cuma happy path
- [ ] Satu elemen menonjol per section, sisanya tenang
