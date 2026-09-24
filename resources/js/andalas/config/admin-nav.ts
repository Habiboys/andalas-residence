import type { LucideIcon } from 'lucide-react';
import {
    Building2,
    Calendar,
    ClipboardCheck,
    CreditCard,
    FileText,
    Home,
    KeyRound,
    LayoutGrid,
    List,
    Map,
    Megaphone,
    Package,
    PenLine,
    Quote,
    ScrollText,
    Star,
    Users,
    Wallet,
} from 'lucide-react';

export type AndalasAdminNavItem = {
    title: string;
    page: string;
    icon: LucideIcon;
    group?: string;
    superadminOnly?: boolean;
};

export const ANDALAS_ADMIN_NAV: AndalasAdminNavItem[] = [
    { title: 'Dashboard', page: 'dashboard', icon: LayoutGrid },
    {
        title: 'Review Pendaftaran',
        page: 'registration-review',
        icon: ClipboardCheck,
        group: 'Operasional',
    },
    {
        title: 'Verifikasi Pembayaran',
        page: 'verifikasi-pembayaran',
        icon: ClipboardCheck,
        group: 'Operasional',
    },
    {
        title: 'Penempatan Kamar',
        page: 'penempatan-kamar',
        icon: Home,
        group: 'Operasional',
    },
    {
        title: 'Pemetaan Kamar',
        page: 'pemetaan-kamar',
        icon: Map,
        group: 'Operasional',
    },
    {
        title: 'Data Mahasiswa',
        page: 'data-mahasiswa',
        icon: Users,
        group: 'Mahasiswa',
    },
    {
        title: 'Gedung & Kamar',
        page: 'kelola-bangunan',
        icon: Building2,
        group: 'Aset & Fasilitas',
    },
    {
        title: 'Kelola Aset',
        page: 'kelola-aset',
        icon: Package,
        group: 'Aset & Fasilitas',
    },
    {
        title: 'Bebas Asrama',
        page: 'approval-bebas-asrama',
        icon: FileText,
        group: 'Pengajuan',
    },
    { title: 'Keuangan', page: 'keuangan', icon: Wallet, group: 'Keuangan' },
    {
        title: 'Jadwal Kegiatan',
        page: 'jadwal-kegiatan',
        icon: Calendar,
        group: 'Lainnya',
    },
    {
        title: 'Penilaian Teknisi',
        page: 'penilaian-teknisi',
        icon: Star,
        group: 'Lainnya',
    },
    {
        title: 'Kelola Profil',
        page: 'kelola-profil',
        icon: PenLine,
        group: 'Landing',
    },
    {
        title: 'Kelola Informasi',
        page: 'kelola-informasi',
        icon: Megaphone,
        group: 'Landing',
    },
    {
        title: 'Kelola Program',
        page: 'kelola-program',
        icon: List,
        group: 'Landing',
    },
    {
        title: 'Kelola Testimoni',
        page: 'kelola-testimoni',
        icon: Quote,
        group: 'Landing',
    },
    {
        title: 'Akun & Role',
        page: 'akun-internal',
        icon: KeyRound,
        group: 'Superadmin',
        superadminOnly: true,
    },
    {
        title: 'Audit Log',
        page: 'audit-log',
        icon: ScrollText,
        group: 'Superadmin',
        superadminOnly: true,
    },
];

export function andalasAppHref(page: string): string {
    const slug = page === 'data-mahasiswa' ? 'mahasiswa' : page;

    return `/admin/${slug}`;
}

export function currentAndalasPage(url: string): string {
    const slug =
        url.split('?')[0]?.split('/').filter(Boolean).at(-1) ?? 'dashboard';

    return slug === 'mahasiswa' ? 'data-mahasiswa' : slug;
}

export function filterAdminNav(isSuperadmin: boolean): AndalasAdminNavItem[] {
    return ANDALAS_ADMIN_NAV.filter(
        (item) => !item.superadminOnly || isSuperadmin,
    );
}
