import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type PageDef = {
    title: string;
    component: LazyExoticComponent<ComponentType<any>> | ComponentType<any>;
};

const p = (title: string, loader: () => Promise<{ default: ComponentType<any> }>): PageDef => ({
    title,
    component: lazy(loader),
});

// ─── Admin / Staff ────────────────────────────────────────────────────────────
const ADMIN_PAGES: Record<string, PageDef> = {
    dashboard: p('Dashboard', () => import('../pages/admin/AdminDashboard')),
    'data-mahasiswa': p('Data Mahasiswa', () => import('../pages/admin/DataMahasiswa')),
    'verifikasi-pembayaran': p('Verifikasi Pembayaran', () => import('../pages/admin/VerifikasiPembayaran')),
    'penempatan-kamar': p('Penempatan Kamar', () => import('../pages/admin/PenempatanKamar')),
    'kelola-bangunan': p('Kelola Bangunan', () => import('../pages/admin/KelolaBangunan')),
    'kelola-aset': p('Kelola Aset', () => import('../pages/admin/KelolaAset')),
    'approval-bebas-asrama': p('Approval Pengajuan', () => import('../pages/admin/ApprovalPengajuan')),
    'approval-izin-pulang': p('Approval Pengajuan', () => import('../pages/admin/ApprovalPengajuan')),
    'pemetaan-kamar': p('Pemetaan Kamar', () => import('../pages/admin/PemetaanKamar')),
    keuangan: p('Keuangan', () => import('../pages/admin/Keuangan')),
    'jadwal-kegiatan': p('Jadwal Kegiatan', () => import('../pages/admin/JadwalKegiatan')),
    'penilaian-teknisi': p('Penilaian Teknisi', () => import('../pages/admin/PenilaianTeknisi')),
    'akun-internal': p('Akun & Role', () => import('../pages/admin/AkunInternal')),
    'audit-log': p('Audit Log', () => import('../pages/admin/AuditLogs')),
    'kelola-profil': p('Kelola Profil', () => import('../pages/admin/KelolaProfil')),
    'kelola-informasi': p('Kelola Informasi', () => import('../pages/admin/KelolaInformasi')),
    'kelola-program': p('Kelola Program', () => import('../pages/admin/KelolaProgram')),
    'kelola-testimoni': p('Kelola Testimoni', () => import('../pages/admin/KelolaTestimoni')),
    'master-data': p('Data Master', () => import('../pages/admin/MasterData')),
};

// ─── Mahasiswa ────────────────────────────────────────────────────────────────
const MAHASISWA_PAGES: Record<string, PageDef> = {
    dashboard: p('Dashboard', () => import('../pages/mahasiswa/Dashboard')),
    tagihan: p('Tagihan & Pembayaran', () => import('../pages/mahasiswa/Tagihan')),
    checkin: p('Proses Check-in', () => import('../pages/mahasiswa/Checkin')),
    'detail-kamar': p('Detail Kamar', () => import('../pages/mahasiswa/DetailKamar')),
    absensi: p('Absensi Sholat', () => import('../pages/mahasiswa/BarcodeAbsensi')),
    'bebas-asrama': p('Pengajuan Bebas Asrama', () => import('../pages/mahasiswa/PengajuanBebasAsrama')),
    'izin-pulang': p('Pengajuan Izin Pulang', () => import('../pages/mahasiswa/PengajuanIzinPulang')),
    'lapor-kerusakan': p('Laporkan Kerusakan', () => import('../pages/mahasiswa/LaporKerusakan')),
    jadwal: p('Jadwal Kegiatan', () => import('../pages/mahasiswa/JadwalKegiatan')),
    'pemetaan-kamar': p('Pemetaan Kamar', () => import('../pages/admin/PemetaanKamar')),
};

// ─── Fasilitator ──────────────────────────────────────────────────────────────
const FASILITATOR_PAGES: Record<string, PageDef> = {
    dashboard: p('Dashboard', () => import('../pages/fasilitator/Dashboard')),
    'scan-barcode': p('Scan Barcode', () => import('../pages/fasilitator/ScanBarcode')),
    'rekap-kehadiran': p('Rekap Kehadiran', () => import('../pages/fasilitator/RekapKehadiran')),
    'monitoring-kamar': p('Monitoring Kamar', () => import('../pages/fasilitator/MonitoringKamar')),
};

// ─── Teknisi ──────────────────────────────────────────────────────────────────
const TEKNISI_PAGES: Record<string, PageDef> = {
    dashboard: p('Dashboard', () => import('../pages/teknisi/Dashboard')),
    'tiket-masuk': p('Tiket Masuk', () => import('../pages/teknisi/TiketMasuk')),
    'update-tiket': p('Update Tiket', () => import('../pages/teknisi/UpdateTiket')),
    'riwayat-penilaian': p('Riwayat & Penilaian', () => import('../pages/teknisi/RiwayatPenilaian')),
};

// ─── Pimpinan ─────────────────────────────────────────────────────────────────
const PIMPINAN_PAGES: Record<string, PageDef> = {
    dashboard: p('Dashboard Eksekutif', () => import('../pages/pimpinan/DashboardEksekutif')),
    'laporan-keuangan': p('Laporan Keuangan', () => import('../pages/pimpinan/LaporanKeuangan')),
    'laporan-aset': p('Laporan Aset', () => import('../pages/pimpinan/LaporanAset')),
};

export type UserRoleKey = 'mahasiswa' | 'fasilitator' | 'staff_admin' | 'superadmin' | 'teknisi' | 'pimpinan';

export const ROLE_PAGES: Record<UserRoleKey, Record<string, PageDef>> = {
    mahasiswa: MAHASISWA_PAGES,
    fasilitator: FASILITATOR_PAGES,
    staff_admin: ADMIN_PAGES,
    superadmin: ADMIN_PAGES,
    teknisi: TEKNISI_PAGES,
    pimpinan: PIMPINAN_PAGES,
};

export function resolvePage(role: string, slug: string): PageDef | undefined {
    const map = ROLE_PAGES[role as UserRoleKey] ?? ADMIN_PAGES;
    return map[slug] ?? map.dashboard;
}

export function pageTitle(role: string, slug: string): string {
    return resolvePage(role, slug)?.title ?? 'Dashboard';
}
