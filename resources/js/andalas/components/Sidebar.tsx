import { Fragment } from 'react';
import {
    ArrowRightLeft,
    BarChart3,
    BedDouble,
    Building2,
    Calendar,
    CreditCard,
    Database,
    Eye,
    FileText,
    Home,
    Inbox,
    KeyRound,
    Landmark,
    List,
    Map,
    Megaphone,
    Package,
    Pencil,
    PieChart,
    QrCode,
    Quote,
    Star,
    Ticket,
    TrendingUp,
    Users,
    Wallet,
    Wrench,
    X,
    type LucideIcon,
} from 'lucide-react';
import { AndalasLogo } from './AndalasLogo';

export type UserRole =
    | 'mahasiswa'
    | 'fasilitator'
    | 'staff_admin'
    | 'admin_layanan'
    | 'admin_aset'
    | 'teknisi'
    | 'pimpinan'
    | 'orang_tua'
    | 'go'
    | 'superadmin';

/*
 * Navigation follows MyUNAND-Akademik: a plain white rail where the active link
 * is a filled primary pill and groups are tiny uppercase headings. Icons use
 * the same lucide set as the rest of the app so there is one icon language.
 */

export interface NavItem {
    label: string;
    page: string;
    icon: LucideIcon;
}

export interface NavGroup {
    group?: string;
    items: NavItem[];
}

const MAHASISWA_NAV: NavGroup[] = [
    { items: [{ label: 'Beranda', page: 'dashboard', icon: Home }] },
    {
        items: [
            {
                label: 'Pendaftaran Asrama',
                page: 'registration',
                icon: BedDouble,
            },
        ],
    },
    {
        group: 'Hunian',
        items: [
            { label: 'Kamar Saya', page: 'detail-kamar', icon: BedDouble },
            { label: 'Pemetaan', page: 'pemetaan-kamar', icon: Map },
        ],
    },
    {
        group: 'Keuangan',
        items: [
            {
                label: 'Tagihan & Pembayaran',
                page: 'tagihan',
                icon: CreditCard,
            },
            { label: 'Check-out', page: 'checkout', icon: ArrowRightLeft },
        ],
    },
    {
        group: 'Pengajuan',
        items: [
            { label: 'Bebas Asrama', page: 'bebas-asrama', icon: FileText },
            { label: 'Perizinan', page: 'perizinan', icon: ArrowRightLeft },
        ],
    },
    {
        group: 'Kegiatan',
        items: [
            { label: 'Jadwal', page: 'jadwal', icon: Calendar },
            { label: 'Scan QR / Absensi', page: 'absensi', icon: QrCode },
        ],
    },
    {
        items: [
            {
                label: 'Laporkan Kerusakan',
                page: 'lapor-kerusakan',
                icon: Wrench,
            },
        ],
    },
];

const ADMIN_LAYANAN_NAV: NavGroup[] = [
    { items: [{ label: 'Dashboard Layanan', page: 'dashboard', icon: Home }] },
    {
        group: 'Layanan',
        items: [
            { label: 'Data Mahasiswa', page: 'data-mahasiswa', icon: Users },
            {
                label: 'Review Pendaftaran',
                page: 'registration-review',
                icon: Inbox,
            },
            {
                label: 'Verifikasi Pembayaran',
                page: 'verifikasi-pembayaran',
                icon: Landmark,
            },
            {
                label: 'Penempatan Kamar',
                page: 'penempatan-kamar',
                icon: BedDouble,
            },
            {
                label: 'Bebas Asrama',
                page: 'approval-bebas-asrama',
                icon: FileText,
            },
            { label: 'Keuangan', page: 'keuangan', icon: Wallet },
        ],
    },
];

const ADMIN_ASET_NAV: NavGroup[] = [
    { items: [{ label: 'Dashboard Aset', page: 'dashboard', icon: Home }] },
    {
        group: 'Aset',
        items: [
            { label: 'Pemetaan Kamar', page: 'pemetaan-kamar', icon: Map },
            {
                label: 'Gedung & Kamar',
                page: 'kelola-bangunan',
                icon: Building2,
            },
            { label: 'Stok Keseluruhan', page: 'stok-aset', icon: Package },
            { label: 'Kelola Aset', page: 'kelola-aset', icon: Package },
        ],
    },
];

const ORANG_TUA_NAV: NavGroup[] = [
    { items: [{ label: 'Dashboard Anak', page: 'dashboard', icon: Home }] },
];

const GO_NAV: NavGroup[] = [
    { items: [{ label: 'Dashboard GO', page: 'dashboard', icon: Home }] },
    {
        group: 'Inspeksi',
        items: [
            { label: 'Monitoring Kamar', page: 'monitoring-kamar', icon: Eye },
            {
                label: 'Inspeksi Check-out',
                page: 'checkout-inspection',
                icon: Inbox,
            },
        ],
    },
];

const FASILITATOR_NAV: NavGroup[] = [
    { items: [{ label: 'Beranda', page: 'dashboard', icon: Home }] },
    {
        group: 'Absensi',
        items: [
            {
                label: 'Kegiatan & Absensi',
                page: 'jadwal-kegiatan',
                icon: Calendar,
            },
        ],
    },
    {
        items: [
            { label: 'Monitoring Kamar', page: 'monitoring-kamar', icon: Eye },
            { label: 'Monitoring Perizinan', page: 'perizinan', icon: Inbox },
            { label: 'Aset per Kamar', page: 'kelola-aset', icon: Package },
            {
                label: 'Finalisasi Check-out',
                page: 'checkout-approval',
                icon: Inbox,
            },
        ],
    },
];

const ADMIN_NAV: NavGroup[] = [
    { items: [{ label: 'Dashboard', page: 'dashboard', icon: Home }] },
    { items: [{ label: 'Data Master', page: 'master-data', icon: Database }] },
    {
        group: 'Operasional',
        items: [
            {
                label: 'Verifikasi Pembayaran',
                page: 'verifikasi-pembayaran',
                icon: Landmark,
            },
            {
                label: 'Penempatan Kamar',
                page: 'penempatan-kamar',
                icon: BedDouble,
            },
            { label: 'Pemetaan Kamar', page: 'pemetaan-kamar', icon: Map },
        ],
    },
    {
        group: 'Mahasiswa',
        items: [
            { label: 'Data Mahasiswa', page: 'data-mahasiswa', icon: Users },
        ],
    },
    {
        group: 'Aset & Fasilitas',
        items: [
            {
                label: 'Gedung & Kamar',
                page: 'kelola-bangunan',
                icon: Building2,
            },
            { label: 'Stok Keseluruhan', page: 'stok-aset', icon: Package },
            { label: 'Kelola Aset', page: 'kelola-aset', icon: Package },
        ],
    },
    {
        group: 'Pengajuan',
        items: [
            {
                label: 'Bebas Asrama',
                page: 'approval-bebas-asrama',
                icon: FileText,
            },
            { label: 'Monitoring Perizinan', page: 'perizinan', icon: Inbox },
        ],
    },
    {
        group: 'Keuangan',
        items: [
            {
                label: 'Pembayaran & Buku Besar',
                page: 'keuangan',
                icon: Wallet,
            },
        ],
    },
    {
        group: 'Landing',
        items: [
            { label: 'Kelola Profil', page: 'kelola-profil', icon: Pencil },
            {
                label: 'Kelola Informasi',
                page: 'kelola-informasi',
                icon: Megaphone,
            },
            { label: 'Kelola Program', page: 'kelola-program', icon: List },
            {
                label: 'Kelola Testimoni',
                page: 'kelola-testimoni',
                icon: Quote,
            },
        ],
    },
    {
        group: 'Lainnya',
        items: [
            {
                label: 'Jadwal Kegiatan',
                page: 'jadwal-kegiatan',
                icon: Calendar,
            },
            {
                label: 'Penilaian Teknisi',
                page: 'penilaian-teknisi',
                icon: Star,
            },
            { label: 'Akun Internal', page: 'akun-internal', icon: KeyRound },
        ],
    },
];

const TEKNISI_NAV: NavGroup[] = [
    { items: [{ label: 'Beranda', page: 'dashboard', icon: Home }] },
    {
        group: 'Tiket',
        items: [
            { label: 'Tiket Masuk', page: 'tiket-masuk', icon: Ticket },
            { label: 'Update Tiket', page: 'update-tiket', icon: Pencil },
        ],
    },
    {
        items: [
            {
                label: 'Riwayat & Penilaian',
                page: 'riwayat-penilaian',
                icon: Star,
            },
        ],
    },
];

const PIMPINAN_NAV: NavGroup[] = [
    {
        items: [
            { label: 'Dashboard Eksekutif', page: 'dashboard', icon: Home },
        ],
    },
    {
        group: 'Laporan',
        items: [
            {
                label: 'Laporan Keuangan',
                page: 'laporan-keuangan',
                icon: TrendingUp,
            },
            { label: 'Laporan Aset', page: 'laporan-aset', icon: PieChart },
        ],
    },
];

export const NAV_MAP: Record<UserRole, NavGroup[]> = {
    mahasiswa: MAHASISWA_NAV,
    fasilitator: FASILITATOR_NAV,
    staff_admin: ADMIN_NAV,
    admin_layanan: ADMIN_LAYANAN_NAV,
    admin_aset: ADMIN_ASET_NAV,
    superadmin: ADMIN_NAV,
    teknisi: TEKNISI_NAV,
    pimpinan: PIMPINAN_NAV,
    orang_tua: ORANG_TUA_NAV,
    go: GO_NAV,
};

interface SidebarProps {
    role: UserRole;
    attendanceEligible?: boolean;
    activeResident?: boolean;
    currentPage: string;
    setPage: (p: string) => void;
    onClose?: () => void;
    collapsed?: boolean;
}

export default function Sidebar({
    role,
    currentPage,
    setPage,
    onClose,
    collapsed = false,
    attendanceEligible = false,
    activeResident = false,
}: SidebarProps) {
    const groups = (NAV_MAP[role] ?? [])
        .map((group) => ({
            ...group,
            items: group.items.filter(
                (item) =>
                    (item.page !== 'perizinan' ||
                        !['staff_admin', 'admin_layanan'].includes(role)) &&
                    (role !== 'mahasiswa' ||
                        ((item.page !== 'absensi' ||
                            attendanceEligible ||
                            activeResident) &&
                            (!['lapor-kerusakan', 'checkout'].includes(
                                item.page,
                            ) ||
                                activeResident))),
            ),
        }))
        .filter((group) => group.items.length > 0);

    return (
        <aside
            className={`border-base-300 bg-base-100 flex h-full flex-col border-r ${collapsed ? 'w-20' : 'w-64'}`}
        >
            <div
                className={`border-base-300 flex h-16 shrink-0 items-center border-b px-3 ${
                    collapsed ? 'justify-center px-2' : 'gap-2'
                }`}
            >
                <AndalasLogo
                    size="sm"
                    variant={collapsed ? 'icon' : 'full'}
                    className="min-w-0"
                />
                {!collapsed && onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-ghost btn-xs"
                        aria-label="Tutup menu"
                    >
                        <X className="size-4" aria-hidden="true" />
                    </button>
                )}
            </div>

            <nav
                className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-3 py-4"
                aria-label="Navigasi utama"
            >
                {groups.map((g, gi) => (
                    <div key={g.group ?? `group-${gi}`}>
                        {g.group && !collapsed && (
                            <p className="text-base-content/40 px-3 text-[10px] font-bold tracking-wider uppercase">
                                {g.group}
                            </p>
                        )}
                        <ul
                            className={
                                g.group && !collapsed
                                    ? 'mt-1.5 space-y-0.5'
                                    : 'space-y-0.5'
                            }
                        >
                            {g.items.map((item) => {
                                const active = currentPage === item.page;
                                const Icon = item.icon;

                                return (
                                    <li key={item.page}>
                                        <button
                                            type="button"
                                            onClick={() => setPage(item.page)}
                                            title={
                                                collapsed
                                                    ? item.label
                                                    : undefined
                                            }
                                            aria-current={
                                                active ? 'page' : undefined
                                            }
                                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-xs font-semibold transition-colors ${
                                                collapsed
                                                    ? 'justify-center px-2'
                                                    : ''
                                            } ${
                                                active
                                                    ? 'bg-primary text-primary-content shadow-xs'
                                                    : 'text-base-content/80 hover:bg-base-200 hover:text-base-content'
                                            }`}
                                        >
                                            <Icon
                                                className="size-[18px] shrink-0"
                                                aria-hidden="true"
                                            />
                                            {!collapsed && (
                                                <span className="truncate">
                                                    {item.label}
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>
        </aside>
    );
}
