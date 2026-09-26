export const ROLE_LABELS: Record<string, string> = {
    mahasiswa: 'Mahasiswa',
    fasilitator: 'Fasilitator',
    staff_admin: 'Staff Admin',
    superadmin: 'Super Admin',
    teknisi: 'Teknisi',
    pimpinan: 'Pimpinan',
};

/*
 * Roles used to carry six different hues (blue, green, purple, red, orange,
 * yellow). Six colours for six values is a rainbow, not a hierarchy: nothing in
 * that set said "more access" and nothing said "less". Only the two privileged
 * roles get a colour now, so the badge actually communicates rank.
 */
export const ROLE_BADGE: Record<string, string> = {
    superadmin: 'badge-accent',
    staff_admin: 'badge-primary',
};

export const roleBadgeClass = (role: string): string =>
    `badge badge-sm badge-neutral ${ROLE_BADGE[role] ?? ''}`;
