import { useEffect, useState } from "react";
import { usePage, router } from "@inertiajs/react";
import { ChevronDown, LogOut, Menu, Search } from "lucide-react";
import * as adminRoutes from "@/routes/admin";
import * as fasilitatorRoutes from "@/routes/fasilitator";
import * as mahasiswaRoutes from "@/routes/mahasiswa";
import * as pimpinanRoutes from "@/routes/pimpinan";
import * as teknisiRoutes from "@/routes/teknisi";
import {
    AuthProvider,
    ThemeProvider,
    useAuth,
    type UserRole,
} from "./context/AppContext";
import { ROLE_LABELS } from "./shellMeta";
import { pageTitle } from "./config/pages";
import Sidebar, { NAV_MAP } from "./components/Sidebar";
import { AccessibilityMenu } from "./components/AccessibilityMenu";
import { NavSearchModal } from "./components/NavSearchModal";

const ROUTE_KEY_ALIASES: Record<string, string> = {
    "data-mahasiswa": "mahasiswa",
    "tiket-masuk": "tiket",
};

const ROLE_KEYS: Record<string, UserRole> = {
    mahasiswa: "mahasiswa",
    fasilitator: "fasilitator",
    staff_admin: "staff_admin",
    superadmin: "superadmin",
    teknisi: "teknisi",
    pimpinan: "pimpinan",
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
            if (e.key !== "/") {
                return;
            }

            const tag = document.activeElement?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
                return;
            }

            e.preventDefault();
            setSearchOpen(true);
        };

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    // Escape closes the account menu so it is dismissable from the keyboard.
    useEffect(() => {
        if (!userMenuOpen) {
            return;
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setUserMenuOpen(false);
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [userMenuOpen]);

    if (!currentUser) {
        return null;
    }

    const roleKey = (ROLE_KEYS[role] ?? "staff_admin") as UserRole;
    const sidebarRole = (
        roleKey === "superadmin" ? "staff_admin" : roleKey
    ) as import("./data/mockData").UserRole;
    const title = pageTitle(role, currentPage);

    const breadcrumb = (() => {
        const groups = NAV_MAP[sidebarRole] ?? [];

        for (const group of groups) {
            const item = group.items.find((i) => i.page === currentPage);
            if (item) {
                return {
                    dashboardLabel: groups.find((g) => g.items.some((i) => i.page === "dashboard"))?.items.find((i) => i.page === "dashboard")?.label ?? "Beranda",
                    group: currentPage === "dashboard" ? null : group.group ?? null,
                    current: item.label,
                };
            }
        }

        return {
            dashboardLabel: "Beranda",
            group: null,
            current: title,
        };
    })();

    const roleRoutes = role === "staff_admin" || role === "superadmin"
        ? adminRoutes
        : role === "mahasiswa"
            ? mahasiswaRoutes
            : role === "fasilitator"
                ? fasilitatorRoutes
                : role === "teknisi"
                    ? teknisiRoutes
                    : pimpinanRoutes;

    const nav = (slug: string) => {
        const routeKey = ROUTE_KEY_ALIASES[slug] ?? slug;
        const routeName = routeKey.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
        const destination = roleRoutes[routeName as keyof typeof roleRoutes];

        if (typeof destination === "function") {
            router.visit(destination.url());
        }
    };

    return (
        <div className="flex min-h-svh bg-base-200">
            {/* Desktop sidebar */}
            <div
                className={`sticky top-0 hidden h-svh shrink-0 overflow-hidden transition-[width] duration-300 lg:flex ${
                    desktopCollapsed ? "w-20" : "w-64"
                }`}
            >
                <Sidebar
                    role={sidebarRole}
                    currentPage={currentPage}
                    setPage={nav}
                    collapsed={desktopCollapsed}
                />
            </div>

            {/* Mobile sidebar */}
            <div
                className={`fixed inset-0 z-50 lg:hidden ${
                    mobileOpen ? "pointer-events-auto" : "pointer-events-none"
                }`}
            >
                <button
                    type="button"
                    tabIndex={mobileOpen ? 0 : -1}
                    aria-label="Tutup menu navigasi"
                    onClick={() => setMobileOpen(false)}
                    className={`absolute inset-0 cursor-default bg-neutral/50 transition-opacity duration-300 ${
                        mobileOpen ? "opacity-100" : "opacity-0"
                    }`}
                />
                <div
                    className={`absolute inset-y-0 left-0 w-56 transition-transform duration-300 ease-out ${
                        mobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <Sidebar
                        role={sidebarRole}
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
                <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-2 border-b border-base-300 bg-base-100/90 px-3 backdrop-blur-md md:px-6">
                    {/* Left: menu buttons + desktop search trigger */}
                    <div className="flex min-w-0 shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className="btn btn-ghost btn-square btn-sm lg:hidden text-base-content"
                            aria-label="Buka menu navigasi"
                        >
                            <Menu className="size-5" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setDesktopCollapsed((c) => !c)}
                            className="hidden lg:inline-flex btn btn-ghost btn-square btn-sm text-base-content hover:bg-base-200"
                            aria-label={
                                desktopCollapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"
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
                                className="flex items-center gap-2.5 rounded-lg border border-base-300 bg-base-100 px-3.5 py-2 text-sm text-base-content/50 hover:bg-base-200 hover:text-base-content/70 transition-colors w-56"
                            >
                                <Search className="size-4 shrink-0" aria-hidden="true" />
                                <span className="flex-1 text-left">Cari…</span>
                                <kbd className="hidden md:inline-block rounded border border-base-300 bg-base-100 px-1.5 text-[10px] text-base-content/40" aria-hidden="true">
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
                            className="sm:hidden btn btn-ghost btn-square btn-sm text-base-content"
                            aria-label="Cari"
                        >
                            <Search className="size-4" aria-hidden="true" />
                        </button>

                        <AccessibilityMenu />

                        <div
                            className={`dropdown dropdown-end ${
                                userMenuOpen ? "dropdown-open" : ""
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => setUserMenuOpen((o) => !o)}
                                className="btn btn-ghost btn-sm gap-2 pl-1 pr-2"
                                aria-haspopup="menu"
                                aria-expanded={userMenuOpen}
                            >
                                <span className="avatar avatar-placeholder">
                                    <span className="w-8 rounded-full bg-primary text-xs font-semibold text-primary-content">
                                        {currentUser.nama.charAt(0)}
                                    </span>
                                </span>
                                <span className="hidden text-xs font-medium md:inline leading-tight">
                                    {currentUser.nama}
                                </span>
                                <ChevronDown className="size-3.5 hidden md:inline-block opacity-60" aria-hidden="true" />
                            </button>

                            <ul
                                className="menu dropdown-content z-50 mt-2 w-60 rounded-box border border-base-300 bg-base-100 p-2 shadow-xl"
                                role="menu"
                            >
                                <li className="menu-title flex-col items-start">
                                    <span className="truncate text-xs text-base-content">
                                        {currentUser.nama}
                                    </span>
                                    <span className="truncate text-xs text-muted">
                                        {currentUser.nim}
                                    </span>
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
                                        className="font-medium text-error hover:bg-error/10"
                                        role="menuitem"
                                    >
                                        <LogOut className="size-4" aria-hidden="true" />
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
                        onNavigate={(page) => nav(page)}
                    />
                </header>

                <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6 lg:p-8">
                    <nav className="breadcrumbs mb-4 text-xs text-base-content/60" aria-label="Navigasi halaman">
                        <ul>
                            <li>
                                <button
                                    type="button"
                                    onClick={() => nav("dashboard")}
                                    className="font-medium hover:text-primary"
                                >
                                    {breadcrumb.dashboardLabel}
                                </button>
                            </li>
                            {breadcrumb.group && <li>{breadcrumb.group}</li>}
                            <li className="font-semibold text-base-content">{breadcrumb.current}</li>
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

export default function ShellLayout({ children }: { children: React.ReactNode }) {
    const { props } = usePage() as unknown as {
        props: {
            initialUser?: unknown;
            role?: string;
            page?: string;
        } & Record<string, unknown>;
    };
    const role = props.role ?? "staff_admin";
    const currentPage = props.page ?? "dashboard";
    const initialUser = (props.initialUser ?? null) as
        | import("./context/AppContext").User
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
