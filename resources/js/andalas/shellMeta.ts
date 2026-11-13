export const ROLE_LABELS: Record<string, string> = {
    mahasiswa: 'Mahasiswa',
    fasilitator: 'Fasilitator',
    staff_admin: 'Staff Admin',
    admin_layanan: 'Admin Layanan',
    admin_aset: 'Admin Aset',
    superadmin: 'Super Admin',
    teknisi: 'Teknisi',
    pimpinan: 'Pimpinan',
    go: 'Petugas Lapangan (GO)',
    orang_tua: 'Orang Tua',
    tamu: 'Penghuni Umum',
};

export const ROLE_BADGE: Record<string, string> = {
    superadmin: 'badge-accent',
    staff_admin: 'badge-primary',
    admin_layanan: 'badge-primary',
    admin_aset: 'badge-info',
    pimpinan: 'badge-secondary',
};

export const roleBadgeClass = (role: string): string =>
    `badge badge-sm ${ROLE_BADGE[role] ?? 'badge-ghost'}`;
