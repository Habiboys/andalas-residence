import { Fragment } from "react";
import {
  ArrowRightLeft,
  BarChart3,
  BedDouble,
  Building2,
  Calendar,
  CreditCard,
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
} from "lucide-react";
import type { UserRole } from "../data/mockData";
import { AndalasLogo } from "./AndalasLogo";

/*
 * Navigation is derived from the same lucide set the rest of the app uses, so
 * there is one icon language instead of a second hand-drawn one. The icons are
 * chosen for what the destination actually is: a bed for a room, a wrench for a
 * repair ticket, a wallet for the ledger.
 */

interface NavItem {
  label: string;
  page: string;
  icon: LucideIcon;
}

interface NavGroup {
  group?: string;
  items: NavItem[];
}

const MAHASISWA_NAV: NavGroup[] = [
  { items: [{ label: "Beranda", page: "dashboard", icon: Home }] },
  {
    group: "Hunian",
    items: [
      { label: "Kamar Saya", page: "detail-kamar", icon: BedDouble },
      { label: "Pemetaan", page: "pemetaan-kamar", icon: Map },
    ],
  },
  {
    group: "Keuangan",
    items: [
      { label: "Tagihan & Pembayaran", page: "tagihan", icon: CreditCard },
      { label: "Check-in", page: "checkin", icon: Landmark },
    ],
  },
  {
    group: "Pengajuan",
    items: [
      { label: "Bebas Asrama", page: "bebas-asrama", icon: FileText },
      { label: "Izin Pulang", page: "izin-pulang", icon: ArrowRightLeft },
    ],
  },
  {
    group: "Kegiatan",
    items: [
      { label: "Jadwal", page: "jadwal", icon: Calendar },
      { label: "Absensi Sholat", page: "absensi", icon: QrCode },
    ],
  },
  { items: [{ label: "Laporkan Kerusakan", page: "lapor-kerusakan", icon: Wrench }] },
];

const FASILITATOR_NAV: NavGroup[] = [
  { items: [{ label: "Beranda", page: "dashboard", icon: Home }] },
  {
    group: "Absensi",
    items: [
      { label: "Scan Barcode", page: "scan-barcode", icon: QrCode },
      { label: "Rekap Kehadiran", page: "rekap-kehadiran", icon: BarChart3 },
    ],
  },
  { items: [{ label: "Monitoring Kamar", page: "monitoring-kamar", icon: Eye }] },
];

const ADMIN_NAV: NavGroup[] = [
  { items: [{ label: "Dashboard", page: "dashboard", icon: Home }] },
  {
    group: "Operasional",
    items: [
      { label: "Verifikasi Pembayaran", page: "verifikasi-pembayaran", icon: Landmark },
      { label: "Penempatan Kamar", page: "penempatan-kamar", icon: BedDouble },
      { label: "Pemetaan Kamar", page: "pemetaan-kamar", icon: Map },
    ],
  },
  {
    group: "Mahasiswa",
    items: [{ label: "Data Mahasiswa", page: "data-mahasiswa", icon: Users }],
  },
  {
    group: "Aset & Fasilitas",
    items: [
      { label: "Gedung & Kamar", page: "kelola-bangunan", icon: Building2 },
      { label: "Kelola Aset", page: "kelola-aset", icon: Package },
    ],
  },
  {
    group: "Pengajuan",
    items: [
      { label: "Bebas Asrama", page: "approval-bebas-asrama", icon: FileText },
      { label: "Izin Pulang", page: "approval-izin-pulang", icon: Inbox },
    ],
  },
  {
    group: "Keuangan",
    items: [{ label: "Pembayaran & Buku Besar", page: "keuangan", icon: Wallet }],
  },
  {
    group: "Landing",
    items: [
      { label: "Kelola Profil", page: "kelola-profil", icon: Pencil },
      { label: "Kelola Informasi", page: "kelola-informasi", icon: Megaphone },
      { label: "Kelola Program", page: "kelola-program", icon: List },
      { label: "Kelola Testimoni", page: "kelola-testimoni", icon: Quote },
    ],
  },
  {
    group: "Lainnya",
    items: [
      { label: "Jadwal Kegiatan", page: "jadwal-kegiatan", icon: Calendar },
      { label: "Penilaian Teknisi", page: "penilaian-teknisi", icon: Star },
      { label: "Akun Internal", page: "akun-internal", icon: KeyRound },
    ],
  },
];

const TEKNISI_NAV: NavGroup[] = [
  { items: [{ label: "Beranda", page: "dashboard", icon: Home }] },
  {
    group: "Tiket",
    items: [
      { label: "Tiket Masuk", page: "tiket-masuk", icon: Ticket },
      { label: "Update Tiket", page: "update-tiket", icon: Pencil },
    ],
  },
  { items: [{ label: "Riwayat & Penilaian", page: "riwayat-penilaian", icon: Star }] },
];

const PIMPINAN_NAV: NavGroup[] = [
  { items: [{ label: "Dashboard Eksekutif", page: "dashboard", icon: Home }] },
  {
    group: "Laporan",
    items: [
      { label: "Laporan Keuangan", page: "laporan-keuangan", icon: TrendingUp },
      { label: "Laporan Aset", page: "laporan-aset", icon: PieChart },
    ],
  },
];

const NAV_MAP: Record<UserRole, NavGroup[]> = {
  mahasiswa: MAHASISWA_NAV,
  fasilitator: FASILITATOR_NAV,
  staff_admin: ADMIN_NAV,
  teknisi: TEKNISI_NAV,
  pimpinan: PIMPINAN_NAV,
};

interface SidebarProps {
  role: UserRole;
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
}: SidebarProps) {
  const groups = NAV_MAP[role] ?? [];

  return (
    <aside
      className={`flex h-full flex-col border-r border-base-300 bg-base-100 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div
        className={`flex h-14 shrink-0 items-center gap-2 border-b border-base-300 px-3 ${
          collapsed ? "justify-center px-2" : ""
        }`}
      >
        <AndalasLogo size="sm" variant={collapsed ? "icon" : "full"} className="min-w-0" />
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

      <nav className="flex-1 overflow-y-auto py-2" aria-label="Navigasi utama">
        <ul className={`menu w-full gap-0.5 ${collapsed ? "menu-xs px-1" : "menu-sm"}`}>
          {groups.map((g, gi) => (
            <Fragment key={g.group ?? `group-${gi}`}>
              {g.group && !collapsed && <li className="menu-title">{g.group}</li>}
              {g.items.map((item) => {
                const active = currentPage === item.page;
                const Icon = item.icon;

                return (
                  <li key={item.page}>
                    {/*
                     * The active state is the daisyUI `menu-active` treatment on
                     * its own. A previous gold stripe beside the label repeated
                     * the same fact in a second channel, so it is gone.
                     */}
                    <button
                      type="button"
                      onClick={() => setPage(item.page)}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={active ? "menu-active" : ""}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </Fragment>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
