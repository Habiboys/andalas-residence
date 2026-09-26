import { useEffect, useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { edit as profileEdit } from '@/routes/profile';
import { ChevronDown, LogOut, Menu, Search } from 'lucide-react';
import * as adminRoutes from '@/routes/admin';
import * as adminLayananRoutes from '@/routes/admin_layanan';
import * as adminAsetRoutes from '@/routes/admin_aset';
import * as goRoutes from '@/routes/go';
import * as orangTuaRoutes from '@/routes/orang_tua';
import * as fasilitatorRoutes from '@/routes/fasilitator';
import * as mahasiswaRoutes from '@/routes/mahasiswa';
import * as pimpinanRoutes from '@/routes/pimpinan';
import * as teknisiRoutes from '@/routes/teknisi';
import {
    AuthProvider,
    ThemeProvider,
    useAuth,
    type UserRole,
} from './context/AppContext';
import { ROLE_LABELS } from './shellMeta';
import { pageTitle } from './config/pages';
import Sidebar, {
    NAV_MAP,
    type UserRole as SidebarUserRole,
} from './components/Sidebar';
import { AccessibilityMenu } from './components/AccessibilityMenu';
import { NavSearchModal } from './components/NavSearchModal';

const ROUTE_KEY_ALIASES: Record<string, string> = {
    'data-mahasiswa': 'mahasiswa',
    'tiket-masuk': 'tiket',
};

const ROLE_KEYS: Record<string, UserRole> = {
    mahasiswa: 'mahasiswa',
    fasilitator: 'fasilitator',
    staff_admin: 'staff_admin',
    admin_layanan: 'admin_layanan',
    admin_aset: 'admin_aset',
    orang_tua: 'orang_tua',
    go: 'go',
    superadmin: 'superadmin',
    teknisi: 'teknisi',
    pimpinan: 'pimpinan',
};

function ShellInner({
    role,
    currentPage,
    children,
}: {
    role: string;
    currentPage: string;
    children: React.ReactNode;
}) {
    const { currentUser, logout } = useAuth();
    const [desktopCollapsed, setDesktopCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    // `/` focuses the navbar search, except when typing in a field.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== '/') {
                return;
            }

            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                return;
            }

            e.preventDefault();
            setSearchOpen(true);
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    // Escape closes the account menu so it is dismissable from the keyboard.
    useEffect(() => {
        if (!userMenuOpen) {
            return;
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setUserMenuOpen(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [userMenuOpen]);

    if (!currentUser) {
        return null;
    }

    const roleKey = (ROLE_KEYS[role] ?? 'staff_admin') as UserRole;
    const sidebarRole = roleKey as SidebarUserRole;
    const title = pageTitle(role, currentPage);

    const breadcrumb = (() => {
        const groups = NAV_MAP[sidebarRole] ?? [];

        for (const group of groups) {
            const item = group.items.find((i) => i.page === currentPage);
            if (item) {
                return {
                    dashboardLabel:
                        groups
                            .find((g) =>
                                g.items.some((i) => i.page === 'dashboard'),
                            )
                            ?.items.find((i) => i.page === 'dashboard')
                            ?.label ?? 'Beranda',
                    group:
                        currentPage === 'dashboard'
                            ? null
                            : (group.group ?? null),
                    current: item.label,
                };
            }
        }

        return {
            dashboardLabel: 'Beranda',
            group: null,
            current: title,
        };
    })();

    const roleRoutes =
        role === 'staff_admin' || role === 'superadmin'
            ? adminRoutes
            : role === 'admin_layanan'
              ? adminLayananRoutes
              : role === 'admin_aset'
                ? adminAsetRoutes
                : role === 'go'
                  ? goRoutes
                  : role === 'orang_tua'
                    ? orangTuaRoutes
                    : role === 'mahasiswa'
                      ? mahasiswaRoutes
                      : role === 'fasilitator'
                        ? fasilitatorRoutes
                        : role === 'teknisi'
                          ? teknisiRoutes
                          : pimpinanRoutes;

    const nav = (slug: string) => {
        const routeKey = ROUTE_KEY_ALIASES[slug] ?? slug;
        const routeName = routeKey.replace(/-([a-z])/g, (_, letter: string) =>
            letter.toUpperCase(),
        );
        const destination = roleRoutes[routeName as keyof typeof roleRoutes];

        if (typeof destination === 'function') {
            router.visit(destination.url());
        }
    };

    return (
        <div className="bg-base-200 flex min-h-svh">
            {/* Desktop sidebar */}
            <div
                className={`sticky top-0 hidden h-svh shrink-0 overflow-hidden transition-[width] duration-300 lg:flex ${
                    desktopCollapsed ? 'w-20' : 'w-64'
                }`}
            >
                <Sidebar
                    role={sidebarRole}
                    attendanceEligible={currentUser.attendance_eligible}
                    activeResident={currentUser.status_huni === 'aktif'}
                    currentPage={currentPage}
                    setPage={nav}
                    collapsed={desktopCollapsed}
                />
            </div>

            {/* Mobile sidebar */}
            <div
                className={`fixed inset-0 z-50 lg:hidden ${
                    mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
            >
                <button
                    type="button"
                    tabIndex={mobileOpen ? 0 : -1}
                    aria-label="Tutup menu navigasi"
                    onClick={() => setMobileOpen(false)}
                    className={`bg-neutral/50 absolute inset-0 cursor-default transition-opacity duration-300 ${
                        mobileOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                />
                <div
                    className={`absolute inset-y-0 left-0 w-64 transition-transform duration-300 ease-out ${
                        mobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    <Sidebar
                        role={sidebarRole}
                        attendanceEligible={currentUser.attendance_eligible}
                        activeResident={currentUser.status_huni === 'aktif'}
                        currentPage={currentPage}
                        setPage={(p) => {
                            nav(p);
                            setMobileOpen(false);
                        }}
                        onClose={() => setMobileOpen(false)}
                    />
                </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="border-base-300 bg-base-100/90 sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-2 border-b px-3 backdrop-blur-md md:px-6">
                    {/* Left: menu buttons + desktop search trigger */}
                    <div className="flex min-w-0 shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className="btn btn-ghost btn-square btn-sm text-base-content lg:hidden"
                            aria-label="Buka menu navigasi"
                        >
                            <Menu className="size-5" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setDesktopCollapsed((c) => !c)}
                            className="btn btn-ghost btn-square btn-sm text-base-content hover:bg-base-200 hidden lg:inline-flex"
                            aria-label={
                                desktopCollapsed
                                    ? 'Tampilkan sidebar'
                                    : 'Sembunyikan sidebar'
                            }
                            aria-pressed={desktopCollapsed}
                        >
                            <Menu className="size-5" aria-hidden="true" />
                        </button>

                        {/* Desktop search trigger */}
                        <div className="hidden sm:block">
                            <button
                                type="button"
                                onClick={() => setSearchOpen(true)}
                                className="border-base-300 bg-base-100 text-base-content/50 hover:bg-base-200 hover:text-base-content/70 flex w-56 items-center gap-2.5 rounded-lg border px-3.5 py-2 text-sm transition-colors"
                            >
                                <Search
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="flex-1 text-left">Cari…</span>
                                <kbd
                                    className="border-base-300 bg-base-100 text-base-content/40 hidden rounded border px-1.5 text-[10px] md:inline-block"
                                    aria-hidden="true"
                                >
                                    /
                                </kbd>
                            </button>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                        {/* Mobile search trigger */}
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="btn btn-ghost btn-square btn-sm text-base-content sm:hidden"
                            aria-label="Cari"
                        >
                            <Search className="size-4" aria-hidden="true" />
                        </button>

                        <AccessibilityMenu />

                        <div
                            className={`dropdown dropdown-end ${
                                userMenuOpen ? 'dropdown-open' : ''
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => setUserMenuOpen((o) => !o)}
                                className="btn btn-ghost btn-sm gap-2 pr-2 pl-1"
                                aria-haspopup="menu"
                                aria-expanded={userMenuOpen}
                            >
                                <span className="avatar avatar-placeholder">
                                    <span className="bg-primary text-primary-content w-8 rounded-full text-xs font-semibold">
                                        {currentUser.nama.charAt(0)}
                                    </span>
                                </span>
                                <span className="hidden text-xs leading-tight font-medium md:inline">
                                    {currentUser.nama}
                                </span>
                                <ChevronDown
                                    className="hidden size-3.5 opacity-60 md:inline-block"
                                    aria-hidden="true"
                                />
                            </button>

                            <ul
                                className="menu dropdown-content rounded-box border-base-300 bg-base-100 z-50 mt-2 w-60 border p-2 shadow-xl"
                                role="menu"
                            >
                                <li className="menu-title flex-col items-start">
                                    <span className="text-base-content truncate text-xs">
                                        {currentUser.nama}
                                    </span>
                                    <span className="text-muted truncate text-xs">
                                        {currentUser.nim}
                                    </span>
                                </li>
                                <li>
                                    <Link
                                        href={profileEdit()}
                                        role="menuitem"
                                        onClick={() => setUserMenuOpen(false)}
                                    >
                                        Profil Saya
                                    </Link>
                                </li>
                                <li className="pointer-events-none px-3 pb-2">
                                    <span className="badge badge-sm badge-outline badge-neutral">
                                        {ROLE_LABELS[roleKey] ?? roleKey}
                                    </span>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={logout}
                                        className="text-error hover:bg-error/10 font-medium"
                                        role="menuitem"
                                    >
                                        <LogOut
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        Keluar
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <NavSearchModal
                        open={searchOpen}
                        onClose={() => setSearchOpen(false)}
                        role={sidebarRole}
                        attendanceEligible={currentUser.attendance_eligible}
                        activeResident={currentUser.status_huni === 'aktif'}
                        onNavigate={(page) => nav(page)}
                    />
                </header>

                <main className="w-full min-w-0 flex-1 p-4 md:p-6">
                    <nav
                        className="breadcrumbs text-base-content/60 mb-4 text-xs"
                        aria-label="Navigasi halaman"
                    >
                        <ul>
                            <li>
                                <button
                                    type="button"
                                    onClick={() => nav('dashboard')}
                                    className="hover:text-primary font-medium"
                                >
                                    {breadcrumb.dashboardLabel}
                                </button>
                            </li>
                            {breadcrumb.group && <li>{breadcrumb.group}</li>}
                            <li className="text-base-content font-semibold">
                                {breadcrumb.current}
                            </li>
                        </ul>
                    </nav>
                    {children}
                </main>
            </div>

            {userMenuOpen && (
                <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    onClick={() => setUserMenuOpen(false)}
                    className="fixed inset-0 z-10 cursor-default"
                />
            )}
        </div>
    );
}

export default function ShellLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { props } = usePage() as unknown as {
        props: {
            initialUser?: unknown;
            role?: string;
            page?: string;
        } & Record<string, unknown>;
    };
    const role = props.role ?? 'staff_admin';
    const currentPage = props.page ?? 'dashboard';
    const initialUser = (props.initialUser ?? null) as
        | import('./context/AppContext').User
        | null;

    return (
        <ThemeProvider>
            <AuthProvider initialUser={initialUser}>
                <ShellInner role={role} currentPage={currentPage}>
                    {children}
                </ShellInner>
            </AuthProvider>
        </ThemeProvider>
    );
}
