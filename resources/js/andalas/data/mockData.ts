export type UserRole = "mahasiswa" | "fasilitator" | "staff_admin" | "teknisi" | "pimpinan";

export interface User {
  nim: string;
  password: string;
  nama: string;
  role: UserRole;
  email?: string;
  no_hp?: string;
  prodi?: string;
  angkatan?: string;
  kamar_id?: string;
  wilayah?: string;
  foto?: string;
}

export interface Gedung {
  id: string;
  nama: string;
  kode: string;
  jumlah_lantai: number;
  kapasitas_total: number;
  terisi: number;
}

export interface Lantai {
  id: string;
  gedung_id: string;
  nomor: number;
  nama: string;
}

export interface Kamar {
  id: string;
  nomor: string;
  gedung_id: string;
  lantai_id: string;
  kapasitas: number;
  terisi: number;
  tipe: "reguler" | "vip";
  status: "kosong" | "terisi" | "penuh" | "maintenance";
  fasilitas: string[];
  penghuni: string[];
}

export interface Pembayaran {
  id: string;
  mahasiswa_nim: string;
  jenis: string;
  jumlah: number;
  status: "pending" | "terverifikasi" | "ditolak";
  tanggal: string;
  tanggal_verifikasi?: string;
  metode: string;
  bukti?: string;
  catatan?: string;
  periode: string;
}

export interface Pengajuan {
  id: string;
  mahasiswa_nim: string;
  tipe: "bebas_asrama" | "izin_pulang";
  alasan: string;
  tanggal_pengajuan: string;
  tanggal_mulai?: string;
  tanggal_kembali?: string;
  status: "pending" | "disetujui" | "ditolak";
  catatan?: string;
  nomor_surat?: string;
  diproses_oleh?: string;
}

export interface Aset {
  id: string;
  kode_inventaris: string;
  nama: string;
  kategori: string;
  kamar_id?: string;
  fasilitas_id?: string;
  nilai: number;
  kondisi: "baik" | "rusak_ringan" | "rusak_berat" | "hilang";
  tahun_pengadaan: string;
}

export interface LaporanKerusakan {
  id: string;
  nomor_tiket: string;
  pelapor_nim: string;
  aset_id: string;
  deskripsi: string;
  tanggal_lapor: string;
  tanggal_selesai?: string;
  status: "baru" | "diproses" | "selesai" | "ditolak";
  teknisi_nim?: string;
  catatan_teknisi?: string;
  penilaian?: number;
  catatan_penilaian?: string;
  prioritas: "rendah" | "sedang" | "tinggi";
}

export interface Absensi {
  id: string;
  mahasiswa_nim: string;
  tanggal: string;
  waktu_sholat: "subuh" | "dzuhur" | "ashar" | "maghrib" | "isya";
  hadir: boolean;
  jam_scan?: string;
}

export interface JadwalKegiatan {
  id: string;
  judul: string;
  deskripsi: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  lokasi: string;
  wajib: boolean;
  peserta_konfirmasi: string[];
}

export interface TransaksiKeuangan {
  id: string;
  tanggal: string;
  jenis: "pemasukan" | "pengeluaran";
  kategori: string;
  deskripsi: string;
  jumlah: number;
  dicatat_oleh: string;
}

// ─── DEMO ACCOUNTS ───────────────────────────────────────────────────────────

export const USERS: User[] = [
  {
    nim: "2110952001",
    password: "mahasiswa123",
    nama: "Ahmad Fauzan",
    role: "mahasiswa",
    email: "ahmad.fauzan@student.unand.ac.id",
    no_hp: "081234567890",
    prodi: "Teknik Informatika",
    angkatan: "2021",
    kamar_id: "B-204",
    foto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format",
  },
  {
    nim: "2110952002",
    password: "mhs456",
    nama: "Rizky Pratama",
    role: "mahasiswa",
    email: "rizky.pratama@student.unand.ac.id",
    no_hp: "081298765432",
    prodi: "Teknik Elektro",
    angkatan: "2021",
    kamar_id: "B-204",
    foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format",
  },
  {
    nim: "2210952015",
    password: "mhs789",
    nama: "Fadhil Ramadhan",
    role: "mahasiswa",
    email: "fadhil.r@student.unand.ac.id",
    no_hp: "085712345678",
    prodi: "Teknik Sipil",
    angkatan: "2022",
    kamar_id: "B-205",
  },
  {
    nim: "2210951022",
    password: "mhs111",
    nama: "Danu Saputra",
    role: "mahasiswa",
    email: "danu.s@student.unand.ac.id",
    no_hp: "082198765432",
    prodi: "Ekonomi",
    angkatan: "2022",
    kamar_id: "A-301",
  },
  {
    nim: "2310952030",
    password: "mhs222",
    nama: "Ilham Hidayat",
    role: "mahasiswa",
    email: "ilham.h@student.unand.ac.id",
    no_hp: "089012345678",
    prodi: "Hukum",
    angkatan: "2023",
    kamar_id: "C-101",
  },
  {
    nim: "FAR001",
    password: "fasilitator123",
    nama: "Budi Santoso",
    role: "fasilitator",
    email: "budi.santoso@unand.ac.id",
    no_hp: "081234567891",
    wilayah: "Gedung B Lt. 2",
  },
  {
    nim: "FAR002",
    password: "fas456",
    nama: "Heru Wibowo",
    role: "fasilitator",
    email: "heru.w@unand.ac.id",
    no_hp: "081234567892",
    wilayah: "Gedung A Lt. 3",
  },
  {
    nim: "ADM001",
    password: "admin123",
    nama: "Siti Rahayu",
    role: "staff_admin",
    email: "siti.rahayu@unand.ac.id",
    no_hp: "081234567893",
  },
  {
    nim: "TEK001",
    password: "teknisi123",
    nama: "Dedi Prasetyo",
    role: "teknisi",
    email: "dedi.p@unand.ac.id",
    no_hp: "081234567894",
  },
  {
    nim: "TEK002",
    password: "tek456",
    nama: "Agus Firmansyah",
    role: "teknisi",
    email: "agus.f@unand.ac.id",
    no_hp: "081234567895",
  },
  {
    nim: "PIM001",
    password: "pimpinan123",
    nama: "Prof. Dr. Hendra Malik",
    role: "pimpinan",
    email: "hendra.malik@unand.ac.id",
    no_hp: "081234567896",
  },
  {
    nim: "SUPER001",
    password: "superadmin123",
    nama: "Super Administrator",
    role: "staff_admin",
    email: "superadmin@unand.ac.id",
    no_hp: "081200000001",
  },
];

export const DEMO_ACCOUNTS = [
  { nim: "2110952001", password: "mahasiswa123", nama: "Ahmad Fauzan", role: "Mahasiswa" },
  { nim: "FAR001", password: "fasilitator123", nama: "Budi Santoso", role: "Fasilitator" },
  { nim: "ADM001", password: "admin123", nama: "Siti Rahayu", role: "Staff Admin" },
  { nim: "SUPER001", password: "superadmin123", nama: "Super Administrator", role: "Super Admin" },
  { nim: "TEK001", password: "teknisi123", nama: "Dedi Prasetyo", role: "Teknisi" },
  { nim: "PIM001", password: "pimpinan123", nama: "Prof. Dr. Hendra Malik", role: "Pimpinan" },
];

// ─── GEDUNG ───────────────────────────────────────────────────────────────────

export const GEDUNG: Gedung[] = [
  { id: "GDA", nama: "Gedung A (Cendana)", kode: "A", jumlah_lantai: 4, kapasitas_total: 160, terisi: 142 },
  { id: "GDB", nama: "Gedung B (Meranti)", kode: "B", jumlah_lantai: 4, kapasitas_total: 160, terisi: 155 },
  { id: "GDC", nama: "Gedung C (Trembesi)", kode: "C", jumlah_lantai: 3, kapasitas_total: 120, terisi: 98 },
  { id: "GDD", nama: "Gedung D (Mahoni)", kode: "D", jumlah_lantai: 3, kapasitas_total: 120, terisi: 87 },
  { id: "GDE", nama: "Gedung E (Rasamala)", kode: "E", jumlah_lantai: 2, kapasitas_total: 80, terisi: 76 },
  { id: "GDF", nama: "Gedung F (Puspa)", kode: "F", jumlah_lantai: 2, kapasitas_total: 80, terisi: 72 },
  { id: "GDG", nama: "Gedung G (Angsana)", kode: "G", jumlah_lantai: 2, kapasitas_total: 80, terisi: 45 },
  { id: "GDH", nama: "Gedung H (Kayu Putih)", kode: "H", jumlah_lantai: 2, kapasitas_total: 80, terisi: 60 },
];

export const LANTAI: Lantai[] = [
  { id: "B-L1", gedung_id: "GDB", nomor: 1, nama: "Lantai 1" },
  { id: "B-L2", gedung_id: "GDB", nomor: 2, nama: "Lantai 2" },
  { id: "B-L3", gedung_id: "GDB", nomor: 3, nama: "Lantai 3" },
  { id: "B-L4", gedung_id: "GDB", nomor: 4, nama: "Lantai 4" },
  { id: "A-L1", gedung_id: "GDA", nomor: 1, nama: "Lantai 1" },
  { id: "A-L2", gedung_id: "GDA", nomor: 2, nama: "Lantai 2" },
  { id: "A-L3", gedung_id: "GDA", nomor: 3, nama: "Lantai 3" },
  { id: "A-L4", gedung_id: "GDA", nomor: 4, nama: "Lantai 4" },
  { id: "C-L1", gedung_id: "GDC", nomor: 1, nama: "Lantai 1" },
  { id: "C-L2", gedung_id: "GDC", nomor: 2, nama: "Lantai 2" },
  { id: "C-L3", gedung_id: "GDC", nomor: 3, nama: "Lantai 3" },
];

export const KAMAR: Kamar[] = [
  { id: "B-201", nomor: "B-201", gedung_id: "GDB", lantai_id: "B-L2", kapasitas: 4, terisi: 4, tipe: "reguler", status: "penuh", fasilitas: ["AC", "WiFi", "Lemari 4 pintu", "Meja belajar x4"], penghuni: ["2110952001", "2110952002", "2110952003", "2110952004"] },
  { id: "B-202", nomor: "B-202", gedung_id: "GDB", lantai_id: "B-L2", kapasitas: 4, terisi: 3, tipe: "reguler", status: "terisi", fasilitas: ["AC", "WiFi", "Lemari 4 pintu", "Meja belajar x4"], penghuni: ["2210952015", "2210952016", "2210952017"] },
  { id: "B-203", nomor: "B-203", gedung_id: "GDB", lantai_id: "B-L2", kapasitas: 2, terisi: 2, tipe: "vip", status: "penuh", fasilitas: ["AC", "WiFi", "Lemari 2 pintu", "Meja belajar x2", "Kulkas mini", "TV 32\""], penghuni: ["2110951010", "2110951011"] },
  { id: "B-204", nomor: "B-204", gedung_id: "GDB", lantai_id: "B-L2", kapasitas: 4, terisi: 2, tipe: "reguler", status: "terisi", fasilitas: ["AC", "WiFi", "Lemari 4 pintu", "Meja belajar x4"], penghuni: ["2110952001", "2110952002"] },
  { id: "B-205", nomor: "B-205", gedung_id: "GDB", lantai_id: "B-L2", kapasitas: 4, terisi: 1, tipe: "reguler", status: "terisi", fasilitas: ["AC", "WiFi", "Lemari 4 pintu", "Meja belajar x4"], penghuni: ["2210952015"] },
  { id: "B-206", nomor: "B-206", gedung_id: "GDB", lantai_id: "B-L2", kapasitas: 4, terisi: 0, tipe: "reguler", status: "kosong", fasilitas: ["AC", "WiFi", "Lemari 4 pintu", "Meja belajar x4"], penghuni: [] },
  { id: "B-207", nomor: "B-207", gedung_id: "GDB", lantai_id: "B-L2", kapasitas: 4, terisi: 0, tipe: "reguler", status: "maintenance", fasilitas: ["AC", "WiFi"], penghuni: [] },
  { id: "B-208", nomor: "B-208", gedung_id: "GDB", lantai_id: "B-L2", kapasitas: 4, terisi: 4, tipe: "reguler", status: "penuh", fasilitas: ["AC", "WiFi", "Lemari 4 pintu", "Meja belajar x4"], penghuni: [] },
  { id: "B-101", nomor: "B-101", gedung_id: "GDB", lantai_id: "B-L1", kapasitas: 4, terisi: 4, tipe: "reguler", status: "penuh", fasilitas: ["AC", "WiFi", "Lemari 4 pintu", "Meja belajar x4"], penghuni: [] },
  { id: "B-102", nomor: "B-102", gedung_id: "GDB", lantai_id: "B-L1", kapasitas: 4, terisi: 3, tipe: "reguler", status: "terisi", fasilitas: ["AC", "WiFi"], penghuni: [] },
  { id: "B-103", nomor: "B-103", gedung_id: "GDB", lantai_id: "B-L1", kapasitas: 4, terisi: 0, tipe: "reguler", status: "kosong", fasilitas: ["AC", "WiFi"], penghuni: [] },
  { id: "A-301", nomor: "A-301", gedung_id: "GDA", lantai_id: "A-L3", kapasitas: 4, terisi: 1, tipe: "reguler", status: "terisi", fasilitas: ["AC", "WiFi", "Lemari 4 pintu"], penghuni: ["2210951022"] },
  { id: "A-302", nomor: "A-302", gedung_id: "GDA", lantai_id: "A-L3", kapasitas: 4, terisi: 4, tipe: "reguler", status: "penuh", fasilitas: ["AC", "WiFi"], penghuni: [] },
  { id: "A-303", nomor: "A-303", gedung_id: "GDA", lantai_id: "A-L3", kapasitas: 2, terisi: 0, tipe: "vip", status: "kosong", fasilitas: ["AC", "WiFi", "Kulkas mini", "TV"], penghuni: [] },
  { id: "C-101", nomor: "C-101", gedung_id: "GDC", lantai_id: "C-L1", kapasitas: 4, terisi: 1, tipe: "reguler", status: "terisi", fasilitas: ["AC", "WiFi"], penghuni: ["2310952030"] },
];

// ─── PEMBAYARAN ───────────────────────────────────────────────────────────────

export const PEMBAYARAN: Pembayaran[] = [
  { id: "PAY001", mahasiswa_nim: "2110952001", jenis: "Biaya Hunian Reguler", jumlah: 1500000, status: "terverifikasi", tanggal: "2025-01-05", tanggal_verifikasi: "2025-01-06", metode: "Transfer Bank", periode: "Jan 2025" },
  { id: "PAY002", mahasiswa_nim: "2110952001", jenis: "Biaya Hunian Reguler", jumlah: 1500000, status: "terverifikasi", tanggal: "2025-02-04", tanggal_verifikasi: "2025-02-05", metode: "Transfer Bank", periode: "Feb 2025" },
  { id: "PAY003", mahasiswa_nim: "2110952001", jenis: "Biaya Hunian Reguler", jumlah: 1500000, status: "terverifikasi", tanggal: "2025-03-03", tanggal_verifikasi: "2025-03-04", metode: "Transfer Bank", periode: "Mar 2025" },
  { id: "PAY004", mahasiswa_nim: "2110952001", jenis: "Biaya Hunian Reguler", jumlah: 1500000, status: "pending", tanggal: "2025-04-01", metode: "Transfer Bank", periode: "Apr 2025" },
  { id: "PAY005", mahasiswa_nim: "2110952002", jenis: "Biaya Hunian Reguler", jumlah: 1500000, status: "pending", tanggal: "2025-04-02", metode: "QRIS", periode: "Apr 2025" },
  { id: "PAY006", mahasiswa_nim: "2210952015", jenis: "Biaya Hunian Reguler", jumlah: 1500000, status: "terverifikasi", tanggal: "2025-03-28", tanggal_verifikasi: "2025-03-29", metode: "Transfer Bank", periode: "Mar 2025" },
  { id: "PAY007", mahasiswa_nim: "2210952015", jenis: "Biaya Hunian Reguler", jumlah: 1500000, status: "ditolak", tanggal: "2025-04-01", metode: "Transfer Bank", catatan: "Bukti tidak jelas", periode: "Apr 2025" },
  { id: "PAY008", mahasiswa_nim: "2210951022", jenis: "Biaya Hunian Reguler", jumlah: 1500000, status: "pending", tanggal: "2025-04-03", metode: "QRIS", periode: "Apr 2025" },
  { id: "PAY009", mahasiswa_nim: "2310952030", jenis: "Biaya Hunian Reguler", jumlah: 1500000, status: "terverifikasi", tanggal: "2025-03-30", metode: "Transfer Bank", periode: "Mar 2025" },
  { id: "PAY010", mahasiswa_nim: "2110952001", jenis: "Denda Keterlambatan", jumlah: 50000, status: "terverifikasi", tanggal: "2025-02-15", metode: "Transfer Bank", periode: "Feb 2025" },
];

// ─── PENGAJUAN ────────────────────────────────────────────────────────────────

export const PENGAJUAN: Pengajuan[] = [
  { id: "PJN001", mahasiswa_nim: "2110952001", tipe: "izin_pulang", alasan: "Pernikahan saudara kandung di Bukittinggi", tanggal_pengajuan: "2025-03-20", tanggal_mulai: "2025-03-22", tanggal_kembali: "2025-03-24", status: "disetujui", catatan: "Disetujui. Harap kembali tepat waktu.", diproses_oleh: "ADM001" },
  { id: "PJN002", mahasiswa_nim: "2110952001", tipe: "bebas_asrama", alasan: "Wisuda pada bulan Juli 2025, tidak lagi membutuhkan tempat tinggal asrama", tanggal_pengajuan: "2025-04-01", status: "pending" },
  { id: "PJN003", mahasiswa_nim: "2110952002", tipe: "izin_pulang", alasan: "Kondisi orang tua sakit, perlu pulang ke Pariaman", tanggal_pengajuan: "2025-03-25", tanggal_mulai: "2025-03-26", tanggal_kembali: "2025-03-28", status: "disetujui", nomor_surat: "SURAT/IZIN/2025/003", diproses_oleh: "ADM001" },
  { id: "PJN004", mahasiswa_nim: "2210952015", tipe: "bebas_asrama", alasan: "Mendapatkan kos dekat tempat magang di kawasan industri", tanggal_pengajuan: "2025-04-02", status: "pending" },
  { id: "PJN005", mahasiswa_nim: "2210951022", tipe: "izin_pulang", alasan: "Lebaran Idul Fitri bersama keluarga di Solok", tanggal_pengajuan: "2025-03-10", tanggal_mulai: "2025-03-28", tanggal_kembali: "2025-04-05", status: "disetujui", nomor_surat: "SURAT/IZIN/2025/005", diproses_oleh: "ADM001" },
  { id: "PJN006", mahasiswa_nim: "2310952030", tipe: "izin_pulang", alasan: "Acara keluarga mendadak", tanggal_pengajuan: "2025-04-03", tanggal_mulai: "2025-04-05", tanggal_kembali: "2025-04-07", status: "ditolak", catatan: "Tidak memenuhi syarat minimal lama tinggal", diproses_oleh: "ADM001" },
];

// ─── ASET ─────────────────────────────────────────────────────────────────────

export const ASET: Aset[] = [
  { id: "AST001", kode_inventaris: "AST/B204/001", nama: "Kasur Busa Single", kategori: "Furniture", kamar_id: "B-204", nilai: 850000, kondisi: "baik", tahun_pengadaan: "2023" },
  { id: "AST002", kode_inventaris: "AST/B204/002", nama: "Lemari Kayu 2 Pintu", kategori: "Furniture", kamar_id: "B-204", nilai: 1200000, kondisi: "baik", tahun_pengadaan: "2023" },
  { id: "AST003", kode_inventaris: "AST/B204/003", nama: "Meja Belajar Lipat", kategori: "Furniture", kamar_id: "B-204", nilai: 450000, kondisi: "rusak_ringan", tahun_pengadaan: "2022" },
  { id: "AST004", kode_inventaris: "AST/B204/004", nama: "AC Split 1 PK", kategori: "Elektronik", kamar_id: "B-204", nilai: 4500000, kondisi: "baik", tahun_pengadaan: "2024" },
  { id: "AST005", kode_inventaris: "AST/B204/005", nama: "Meja Belajar Lipat", kategori: "Furniture", kamar_id: "B-204", nilai: 450000, kondisi: "baik", tahun_pengadaan: "2023" },
  { id: "AST006", kode_inventaris: "AST/B202/001", nama: "Kasur Busa Single", kategori: "Furniture", kamar_id: "B-202", nilai: 850000, kondisi: "baik", tahun_pengadaan: "2023" },
  { id: "AST007", kode_inventaris: "AST/B202/002", nama: "AC Split 1 PK", kategori: "Elektronik", kamar_id: "B-202", nilai: 4500000, kondisi: "rusak_berat", tahun_pengadaan: "2021" },
  { id: "AST008", kode_inventaris: "AST/SRR/001", nama: "Proyektor Epson", kategori: "Elektronik", fasilitas_id: "surrau_utama", nilai: 8500000, kondisi: "baik", tahun_pengadaan: "2024" },
  { id: "AST009", kode_inventaris: "AST/SRR/002", nama: "Barcode Scanner USB", kategori: "Elektronik", fasilitas_id: "surrau_utama", nilai: 350000, kondisi: "baik", tahun_pengadaan: "2024" },
  { id: "AST010", kode_inventaris: "AST/DPR/001", nama: "Kompor Gas 2 Tungku", kategori: "Dapur", fasilitas_id: "dapur_lantai2", nilai: 750000, kondisi: "baik", tahun_pengadaan: "2023" },
  { id: "AST011", kode_inventaris: "AST/DPR/002", nama: "Kulkas 2 Pintu Sharp", kategori: "Elektronik", fasilitas_id: "dapur_lantai2", nilai: 3200000, kondisi: "rusak_ringan", tahun_pengadaan: "2022" },
  { id: "AST012", kode_inventaris: "AST/B205/001", nama: "Kasur Busa Single", kategori: "Furniture", kamar_id: "B-205", nilai: 850000, kondisi: "hilang", tahun_pengadaan: "2022" },
];

// ─── LAPORAN KERUSAKAN ────────────────────────────────────────────────────────

export const LAPORAN_KERUSAKAN: LaporanKerusakan[] = [
  { id: "TKT001", nomor_tiket: "TKT/2025/001", pelapor_nim: "2110952001", aset_id: "AST003", deskripsi: "Engsel meja belajar patah, tidak bisa dilipat dengan benar. Sudah berlangsung 1 minggu.", tanggal_lapor: "2025-03-15", status: "selesai", teknisi_nim: "TEK001", catatan_teknisi: "Engsel diganti dengan yang baru. Meja sudah berfungsi normal.", tanggal_selesai: "2025-03-17", penilaian: 5, catatan_penilaian: "Cepat dan rapi", prioritas: "rendah" },
  { id: "TKT002", nomor_tiket: "TKT/2025/002", pelapor_nim: "2110952002", aset_id: "AST007", deskripsi: "AC tidak dingin sama sekali, sudah tidak berfungsi sejak 3 hari lalu. Kamar sangat panas.", tanggal_lapor: "2025-03-28", status: "diproses", teknisi_nim: "TEK001", catatan_teknisi: "Menunggu spare part freon.", prioritas: "tinggi" },
  { id: "TKT003", nomor_tiket: "TKT/2025/003", pelapor_nim: "2210952015", aset_id: "AST012", deskripsi: "Kasur di kamar B-205 slot ke-3 hilang, tidak ada kasurnya.", tanggal_lapor: "2025-03-30", status: "baru", prioritas: "sedang" },
  { id: "TKT004", nomor_tiket: "TKT/2025/004", pelapor_nim: "2210951022", aset_id: "AST011", deskripsi: "Kulkas di dapur lantai 2 bersuara aneh dan tidak mendinginkan.", tanggal_lapor: "2025-04-01", status: "baru", prioritas: "sedang" },
  { id: "TKT005", nomor_tiket: "TKT/2025/005", pelapor_nim: "2110952001", aset_id: "AST001", deskripsi: "Sarung kasur robek di bagian sudut, perlu penggantian.", tanggal_lapor: "2025-04-02", status: "baru", prioritas: "rendah" },
  { id: "TKT006", nomor_tiket: "TKT/2025/006", pelapor_nim: "2310952030", aset_id: "AST010", deskripsi: "Kompor gas di dapur C-L1 apinya tidak merata, satu tungku tidak mau menyala.", tanggal_lapor: "2025-04-03", status: "diproses", teknisi_nim: "TEK002", prioritas: "tinggi" },
  { id: "TKT007", nomor_tiket: "TKT/2025/007", pelapor_nim: "2110952002", aset_id: "AST004", deskripsi: "Remote AC hilang", tanggal_lapor: "2025-02-10", status: "selesai", teknisi_nim: "TEK001", catatan_teknisi: "Remote baru sudah diberikan.", tanggal_selesai: "2025-02-12", penilaian: 4, catatan_penilaian: "Bagus tapi agak lama", prioritas: "rendah" },
];

// ─── ABSENSI ──────────────────────────────────────────────────────────────────

export const ABSENSI: Absensi[] = [
  { id: "ABS001", mahasiswa_nim: "2110952001", tanggal: "2025-04-01", waktu_sholat: "subuh", hadir: true, jam_scan: "05:15" },
  { id: "ABS002", mahasiswa_nim: "2110952001", tanggal: "2025-04-01", waktu_sholat: "dzuhur", hadir: true, jam_scan: "12:20" },
  { id: "ABS003", mahasiswa_nim: "2110952001", tanggal: "2025-04-01", waktu_sholat: "ashar", hadir: false },
  { id: "ABS004", mahasiswa_nim: "2110952001", tanggal: "2025-04-01", waktu_sholat: "maghrib", hadir: true, jam_scan: "18:30" },
  { id: "ABS005", mahasiswa_nim: "2110952001", tanggal: "2025-04-01", waktu_sholat: "isya", hadir: true, jam_scan: "19:45" },
  { id: "ABS006", mahasiswa_nim: "2110952001", tanggal: "2025-03-31", waktu_sholat: "subuh", hadir: true, jam_scan: "05:12" },
  { id: "ABS007", mahasiswa_nim: "2110952001", tanggal: "2025-03-31", waktu_sholat: "dzuhur", hadir: true, jam_scan: "12:18" },
  { id: "ABS008", mahasiswa_nim: "2110952001", tanggal: "2025-03-31", waktu_sholat: "ashar", hadir: true, jam_scan: "15:30" },
  { id: "ABS009", mahasiswa_nim: "2110952001", tanggal: "2025-03-31", waktu_sholat: "maghrib", hadir: false },
  { id: "ABS010", mahasiswa_nim: "2110952001", tanggal: "2025-03-31", waktu_sholat: "isya", hadir: true, jam_scan: "19:50" },
  { id: "ABS011", mahasiswa_nim: "2110952001", tanggal: "2025-03-30", waktu_sholat: "subuh", hadir: false },
  { id: "ABS012", mahasiswa_nim: "2110952001", tanggal: "2025-03-30", waktu_sholat: "dzuhur", hadir: true, jam_scan: "12:25" },
  { id: "ABS013", mahasiswa_nim: "2110952001", tanggal: "2025-03-30", waktu_sholat: "ashar", hadir: true, jam_scan: "15:28" },
  { id: "ABS014", mahasiswa_nim: "2110952001", tanggal: "2025-03-30", waktu_sholat: "maghrib", hadir: true, jam_scan: "18:32" },
  { id: "ABS015", mahasiswa_nim: "2110952001", tanggal: "2025-03-30", waktu_sholat: "isya", hadir: true, jam_scan: "19:48" },
  { id: "ABS016", mahasiswa_nim: "2110952002", tanggal: "2025-04-01", waktu_sholat: "subuh", hadir: true, jam_scan: "05:10" },
  { id: "ABS017", mahasiswa_nim: "2110952002", tanggal: "2025-04-01", waktu_sholat: "dzuhur", hadir: true, jam_scan: "12:22" },
  { id: "ABS018", mahasiswa_nim: "2110952002", tanggal: "2025-04-01", waktu_sholat: "ashar", hadir: true, jam_scan: "15:31" },
  { id: "ABS019", mahasiswa_nim: "2110952002", tanggal: "2025-04-01", waktu_sholat: "maghrib", hadir: false },
  { id: "ABS020", mahasiswa_nim: "2110952002", tanggal: "2025-04-01", waktu_sholat: "isya", hadir: true, jam_scan: "19:55" },
  { id: "ABS021", mahasiswa_nim: "2210952015", tanggal: "2025-04-01", waktu_sholat: "subuh", hadir: false },
  { id: "ABS022", mahasiswa_nim: "2210952015", tanggal: "2025-04-01", waktu_sholat: "dzuhur", hadir: false },
  { id: "ABS023", mahasiswa_nim: "2210952015", tanggal: "2025-04-01", waktu_sholat: "ashar", hadir: true, jam_scan: "15:35" },
  { id: "ABS024", mahasiswa_nim: "2210952015", tanggal: "2025-04-01", waktu_sholat: "maghrib", hadir: true, jam_scan: "18:28" },
  { id: "ABS025", mahasiswa_nim: "2210952015", tanggal: "2025-04-01", waktu_sholat: "isya", hadir: true, jam_scan: "19:52" },
];

// ─── JADWAL KEGIATAN ──────────────────────────────────────────────────────────

export const JADWAL_KEGIATAN: JadwalKegiatan[] = [
  { id: "JDW001", judul: "Kajian Rutin Mingguan", deskripsi: "Kajian Islam tentang adab dan etika dalam kehidupan kampus. Dibawakan oleh Ustadz Dr. Zulkifli, MA.", tanggal: "2025-04-06", jam_mulai: "08:00", jam_selesai: "10:00", lokasi: "Aula Utama Asrama", wajib: true, peserta_konfirmasi: ["2110952001", "2110952002", "2210952015"] },
  { id: "JDW002", judul: "Kerja Bakti Gedung B", deskripsi: "Pembersihan bersama seluruh penghuni Gedung B. Setiap penghuni wajib hadir membawa peralatan kebersihan.", tanggal: "2025-04-05", jam_mulai: "06:30", jam_selesai: "08:30", lokasi: "Gedung B", wajib: true, peserta_konfirmasi: ["2110952001"] },
  { id: "JDW003", judul: "Sosialisasi Tata Tertib 2025/2026", deskripsi: "Pemaparan aturan asrama terbaru untuk semua penghuni. Wajib dihadiri oleh seluruh penghuni.", tanggal: "2025-04-08", jam_mulai: "14:00", jam_selesai: "16:00", lokasi: "Aula Utama Asrama", wajib: true, peserta_konfirmasi: ["2110952002"] },
  { id: "JDW004", judul: "Turnamen Futsal Antar Gedung", deskripsi: "Kompetisi futsal antar penghuni gedung A, B, C. Daftarkan tim kamu segera!", tanggal: "2025-04-12", jam_mulai: "15:00", jam_selesai: "18:00", lokasi: "Lapangan Olahraga Asrama", wajib: false, peserta_konfirmasi: ["2110952001", "2110952002", "2210952015", "2210951022"] },
  { id: "JDW005", judul: "Pembekalan Wirausaha Mahasiswa", deskripsi: "Workshop kewirausahaan untuk penghuni asrama. Pembicara dari alumni Unand yang sukses berbisnis.", tanggal: "2025-04-15", jam_mulai: "09:00", jam_selesai: "12:00", lokasi: "Ruang Seminar Asrama", wajib: false, peserta_konfirmasi: ["2110952001", "2310952030"] },
];

// ─── TRANSAKSI KEUANGAN ───────────────────────────────────────────────────────

export const TRANSAKSI_KEUANGAN: TransaksiKeuangan[] = [
  { id: "TRX001", tanggal: "2025-01-05", jenis: "pemasukan", kategori: "Biaya Hunian", deskripsi: "Batch pembayaran hunian Jan 2025 untuk 148 mahasiswa", jumlah: 222000000, dicatat_oleh: "ADM001" },
  { id: "TRX002", tanggal: "2025-01-10", jenis: "pengeluaran", kategori: "Pemeliharaan", deskripsi: "Servis AC Gedung B lantai 1-2 (12 unit)", jumlah: 4800000, dicatat_oleh: "ADM001" },
  { id: "TRX003", tanggal: "2025-01-15", jenis: "pengeluaran", kategori: "Utilitas", deskripsi: "Tagihan listrik Gedung A-D bulan Desember 2024", jumlah: 18500000, dicatat_oleh: "ADM001" },
  { id: "TRX004", tanggal: "2025-01-20", jenis: "pengeluaran", kategori: "Utilitas", deskripsi: "Tagihan air PDAM bulan Desember 2024", jumlah: 3200000, dicatat_oleh: "ADM001" },
  { id: "TRX005", tanggal: "2025-02-05", jenis: "pemasukan", kategori: "Biaya Hunian", deskripsi: "Batch pembayaran hunian Feb 2025 untuk 152 mahasiswa", jumlah: 228000000, dicatat_oleh: "ADM001" },
  { id: "TRX006", tanggal: "2025-02-08", jenis: "pengeluaran", kategori: "Pemeliharaan", deskripsi: "Pengecatan ulang Gedung C lantai 1", jumlah: 12000000, dicatat_oleh: "ADM001" },
  { id: "TRX007", tanggal: "2025-02-12", jenis: "pemasukan", kategori: "Denda", deskripsi: "Denda keterlambatan pembayaran Feb 2025", jumlah: 1500000, dicatat_oleh: "ADM001" },
  { id: "TRX008", tanggal: "2025-02-15", jenis: "pengeluaran", kategori: "Utilitas", deskripsi: "Tagihan listrik Gedung A-D bulan Januari 2025", jumlah: 19200000, dicatat_oleh: "ADM001" },
  { id: "TRX009", tanggal: "2025-03-05", jenis: "pemasukan", kategori: "Biaya Hunian", deskripsi: "Batch pembayaran hunian Mar 2025 untuk 156 mahasiswa", jumlah: 234000000, dicatat_oleh: "ADM001" },
  { id: "TRX010", tanggal: "2025-03-10", jenis: "pengeluaran", kategori: "Inventaris", deskripsi: "Pembelian kasur baru Gedung D (20 unit)", jumlah: 17000000, dicatat_oleh: "ADM001" },
  { id: "TRX011", tanggal: "2025-03-15", jenis: "pengeluaran", kategori: "Utilitas", deskripsi: "Tagihan listrik Gedung A-D bulan Februari 2025", jumlah: 17800000, dicatat_oleh: "ADM001" },
  { id: "TRX012", tanggal: "2025-04-03", jenis: "pemasukan", kategori: "Biaya Hunian", deskripsi: "Batch pembayaran hunian Apr 2025 untuk 143 mahasiswa (masih berjalan)", jumlah: 214500000, dicatat_oleh: "ADM001" },
];

export const TREN_PEMBAYARAN = [
  { bulan: "Nov", pemasukan: 198000000, pengeluaran: 32000000 },
  { bulan: "Des", pemasukan: 210000000, pengeluaran: 41000000 },
  { bulan: "Jan", pemasukan: 222000000, pengeluaran: 26500000 },
  { bulan: "Feb", pemasukan: 229500000, pengeluaran: 31200000 },
  { bulan: "Mar", pemasukan: 234000000, pengeluaran: 34800000 },
  { bulan: "Apr", pemasukan: 214500000, pengeluaran: 22000000 },
];
