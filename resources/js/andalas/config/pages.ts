type RoleKey =
    | 'mahasiswa'
    | 'fasilitator'
    | 'staff_admin'
    | 'admin_layanan'
    | 'admin_aset'
    | 'orang_tua'
    | 'go'
    | 'superadmin'
    | 'teknisi'
    | 'pimpinan';

const ADMIN_PAGES: Record<string, string> = {
    'temporary-stays': 'Hunian Sementara',
    'residence-management': 'Pengaturan Layanan',
    invoices: 'Invoice',
    perizinan: 'Monitoring Perizinan',
    'stok-aset': 'Stok Aset Keseluruhan',
    'registration-review': 'Review Pendaftaran',
    dashboard: 'Dashboard',
    'data-mahasiswa': 'Data Mahasiswa',
    'verifikasi-pembayaran': 'Verifikasi Pembayaran',
    'penempatan-kamar': 'Penempatan Kamar',
    'kelola-bangunan': 'Kelola Bangunan',
    'kelola-aset': 'Kelola Aset',
    'approval-bebas-asrama': 'Approval Pengajuan',
    'kelola-penandatangan': 'Kelola Penandatangan',
    'pemetaan-kamar': 'Pemetaan Kamar',
    keuangan: 'Keuangan',
    'jadwal-kegiatan': 'Jadwal Kegiatan',
    'penilaian-teknisi': 'Penilaian Teknisi',
    'akun-internal': 'Akun & Role',
    'audit-log': 'Audit Log',
    'kelola-informasi': 'Kelola Informasi',
    'kelola-program': 'Kelola Program',
    'kelola-testimoni': 'Kelola Testimoni',
    'master-data': 'Data Master',
};

const MAHASISWA_PAGES: Record<string, string> = {
    dashboard: 'Dashboard',
    registration: 'Pendaftaran Asrama',
    tagihan: 'Tagihan & Pembayaran',
    'detail-kamar': 'Detail Kamar',
    absensi: 'Absensi Kegiatan',
    'bebas-asrama': 'Pengajuan Bebas Asrama',
    perizinan: 'Perizinan',
    'lapor-kerusakan': 'Laporkan Kerusakan',
    jadwal: 'Jadwal Kegiatan',
    checkout: 'Pengajuan Check-out',
};

const FASILITATOR_PAGES: Record<string, string> = {
    'temporary-stays': 'Hunian Sementara',
    perizinan: 'Monitoring Perizinan',
    'kelola-aset': 'Aset per Kamar',
    'jadwal-kegiatan': 'Kegiatan & Absensi',
    dashboard: 'Dashboard',
    'monitoring-kamar': 'Monitoring Kamar',
    'checkout-approval': 'Finalisasi Check-out',
};

const TEKNISI_PAGES: Record<string, string> = {
    dashboard: 'Dashboard',
    'tiket-masuk': 'Tiket Masuk',
    'update-tiket': 'Update Tiket',
    'riwayat-penilaian': 'Riwayat & Penilaian',
};

const ADMIN_LAYANAN_PAGES: Record<string, string> = {
    'temporary-stays': 'Hunian Sementara',
    'residence-management': 'Pengaturan Layanan',
    invoices: 'Invoice',
    dashboard: 'Dashboard Layanan',
    'data-mahasiswa': 'Data Mahasiswa',
    'verifikasi-pembayaran': 'Verifikasi Pembayaran',
    'penempatan-kamar': 'Penempatan Kamar',
    'approval-bebas-asrama': 'Approval Bebas Asrama',
    'kelola-penandatangan': 'Kelola Penandatangan',
    keuangan: 'Keuangan',
    'jadwal-kegiatan': 'Jadwal Kegiatan',
    'registration-review': 'Review Pendaftaran',
};

const ADMIN_ASET_PAGES: Record<string, string> = {
    'stok-aset': 'Stok Aset Keseluruhan',
    dashboard: 'Dashboard Aset',
    'pemetaan-kamar': 'Pemetaan Kamar',
    'kelola-bangunan': 'Kelola Bangunan',
    'kelola-aset': 'Kelola Aset',
};

const ORANG_TUA_PAGES: Record<string, string> = {
    dashboard: 'Dashboard Orang Tua',
};

const GO_PAGES: Record<string, string> = {
    dashboard: 'Dashboard GO',
    'monitoring-kamar': 'Inspeksi Kamar',
    'checkout-inspection': 'Inspeksi Check-out',
};

const PIMPINAN_PAGES: Record<string, string> = {
    dashboard: 'Dashboard Eksekutif',
    'laporan-keuangan': 'Laporan Keuangan',
    'laporan-aset': 'Laporan Aset',
};

const SETTINGS_PAGES: Record<string, string> = {
    'settings-profile': 'Profil Saya',
    'settings-security': 'Keamanan & Password',
    'settings-appearance': 'Tampilan',
};

const ROLE_PAGES: Record<RoleKey, Record<string, string>> = {
    mahasiswa: { ...MAHASISWA_PAGES, ...SETTINGS_PAGES },
    fasilitator: { ...FASILITATOR_PAGES, ...SETTINGS_PAGES },
    staff_admin: { ...ADMIN_PAGES, ...SETTINGS_PAGES },
    admin_layanan: { ...ADMIN_LAYANAN_PAGES, ...SETTINGS_PAGES },
    admin_aset: { ...ADMIN_ASET_PAGES, ...SETTINGS_PAGES },
    orang_tua: { ...ORANG_TUA_PAGES, ...SETTINGS_PAGES },
    go: { ...GO_PAGES, ...SETTINGS_PAGES },
    superadmin: { ...ADMIN_PAGES, ...SETTINGS_PAGES },
    teknisi: { ...TEKNISI_PAGES, ...SETTINGS_PAGES },
    pimpinan: { ...PIMPINAN_PAGES, ...SETTINGS_PAGES },
};

export function pageTitle(role: string, slug: string): string {
    const map = ROLE_PAGES[role as RoleKey] ?? ADMIN_PAGES;

    return map[slug] ?? map.dashboard ?? 'Dashboard';
}
