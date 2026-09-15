type RoleKey = 'mahasiswa' | 'fasilitator' | 'staff_admin' | 'superadmin' | 'teknisi' | 'pimpinan';

const ADMIN_PAGES: Record<string, string> = {
    dashboard: 'Dashboard',
    'data-mahasiswa': 'Data Mahasiswa',
    'verifikasi-pembayaran': 'Verifikasi Pembayaran',
    'penempatan-kamar': 'Penempatan Kamar',
    'kelola-bangunan': 'Kelola Bangunan',
    'kelola-aset': 'Kelola Aset',
    'approval-bebas-asrama': 'Approval Pengajuan',
    'approval-izin-pulang': 'Approval Pengajuan',
    'pemetaan-kamar': 'Pemetaan Kamar',
    keuangan: 'Keuangan',
    'jadwal-kegiatan': 'Jadwal Kegiatan',
    'penilaian-teknisi': 'Penilaian Teknisi',
    'akun-internal': 'Akun & Role',
    'audit-log': 'Audit Log',
    'kelola-profil': 'Kelola Profil',
    'kelola-informasi': 'Kelola Informasi',
    'kelola-program': 'Kelola Program',
    'kelola-testimoni': 'Kelola Testimoni',
    'master-data': 'Data Master',
};

const MAHASISWA_PAGES: Record<string, string> = {
    dashboard: 'Dashboard',
    tagihan: 'Tagihan & Pembayaran',
    checkin: 'Proses Check-in',
    'detail-kamar': 'Detail Kamar',
    absensi: 'Absensi Sholat',
    'bebas-asrama': 'Pengajuan Bebas Asrama',
    'izin-pulang': 'Pengajuan Izin Pulang',
    'lapor-kerusakan': 'Laporkan Kerusakan',
    jadwal: 'Jadwal Kegiatan',
    'pemetaan-kamar': 'Pemetaan Kamar',
};

const FASILITATOR_PAGES: Record<string, string> = {
    dashboard: 'Dashboard',
    'scan-barcode': 'Scan Barcode',
    'rekap-kehadiran': 'Rekap Kehadiran',
    'monitoring-kamar': 'Monitoring Kamar',
};

const TEKNISI_PAGES: Record<string, string> = {
    dashboard: 'Dashboard',
    'tiket-masuk': 'Tiket Masuk',
    'update-tiket': 'Update Tiket',
    'riwayat-penilaian': 'Riwayat & Penilaian',
};

const PIMPINAN_PAGES: Record<string, string> = {
    dashboard: 'Dashboard Eksekutif',
    'laporan-keuangan': 'Laporan Keuangan',
    'laporan-aset': 'Laporan Aset',
};

const ROLE_PAGES: Record<RoleKey, Record<string, string>> = {
    mahasiswa: MAHASISWA_PAGES,
    fasilitator: FASILITATOR_PAGES,
    staff_admin: ADMIN_PAGES,
    superadmin: ADMIN_PAGES,
    teknisi: TEKNISI_PAGES,
    pimpinan: PIMPINAN_PAGES,
};

export function pageTitle(role: string, slug: string): string {
    const map = ROLE_PAGES[role as RoleKey] ?? ADMIN_PAGES;

    return map[slug] ?? map.dashboard ?? 'Dashboard';
}