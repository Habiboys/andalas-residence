export const ROLE_LABELS: Record<string, string> = {
    mahasiswa: 'Mahasiswa',
    fasilitator: 'Fasilitator',
    staff_admin: 'Staff Admin',
    superadmin: 'Super Admin',
    teknisi: 'Teknisi',
    pimpinan: 'Pimpinan',
};

export const ROLE_BADGE: Record<string, string> = {
    superadmin: 'badge-accent',
    staff_admin: 'badge-primary',
};

export const roleBadgeClass = (role: string): string =>
    `badge badge-sm ${ROLE_BADGE[role] ?? 'badge-ghost'}`;
