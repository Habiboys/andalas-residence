import { useEffect, useState } from "react";
import { usePage, router } from "@inertiajs/react";
import { ChevronDown, LogOut, Menu, Moon, Sun } from "lucide-react";
import {
    AuthProvider,
    ThemeProvider,
    useAuth,
    useTheme,
    type UserRole,
} from "./context/AppContext";
import { ROLE_LABELS } from "./shellMeta";
import { pageTitle } from "./config/pages";
import Sidebar from "./components/Sidebar";

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
    const { darkMode, toggleDarkMode } = useTheme();
    const [desktopCollapsed, setDesktopCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

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

    const nav = (slug: string) => {
        router.visit(`/app/${role}/${slug === "dashboard" ? "" : slug}`.replace(/\/$/, ""));
    };

    return (
        <div className="flex min-h-svh bg-base-200">
            {/* Desktop sidebar */}
            <div
                className={`hidden shrink-0 overflow-hidden transition-[width] duration-200 lg:flex ${
                    desktopCollapsed ? "w-16" : "w-56"
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

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <header className="navbar min-h-14 shrink-0 gap-2 border-b border-base-300 bg-base-100 px-3">
                    <div className="navbar-start gap-1">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className="btn btn-ghost btn-sm lg:hidden"
                            aria-label="Buka menu navigasi"
                        >
                            <Menu className="size-5" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setDesktopCollapsed((c) => !c)}
                            className="btn btn-ghost btn-sm hidden lg:inline-flex"
                            aria-label={
                                desktopCollapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"
                            }
                            aria-pressed={desktopCollapsed}
                        >
                            <Menu className="size-5" aria-hidden="true" />
                        </button>
                    </div>

                    <div className="navbar-center min-w-0 justify-start">
                        <h1 className="truncate font-serif text-sm lg:text-base">{title}</h1>
                    </div>

                    <div className="navbar-end gap-1">
                        <button
                            type="button"
                            onClick={toggleDarkMode}
                            className="btn btn-ghost btn-sm"
                            aria-label={
                                darkMode ? "Ganti ke tema terang" : "Ganti ke tema gelap"
                            }
                            aria-pressed={darkMode}
                        >
                            {darkMode ? (
                                <Sun className="size-4" aria-hidden="true" />
                            ) : (
                                <Moon className="size-4" aria-hidden="true" />
                            )}
                        </button>

                        <div
                            className={`dropdown dropdown-end ${
                                userMenuOpen ? "dropdown-open" : ""
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => setUserMenuOpen((o) => !o)}
                                className="btn btn-ghost btn-sm gap-2 px-1.5"
                                aria-haspopup="menu"
                                aria-expanded={userMenuOpen}
                            >
                                <span className="avatar avatar-placeholder">
                                    <span className="w-7 rounded-full bg-primary text-xs font-semibold text-primary-content">
                                        {currentUser.nama.charAt(0)}
                                    </span>
                                </span>
                                <span className="hidden text-xs font-medium sm:inline">
                                    {currentUser.nama.split(" ")[0]}
                                </span>
                                <ChevronDown className="size-3.5" aria-hidden="true" />
                            </button>

                            <ul
                                className="menu dropdown-content z-20 w-60 rounded-box border border-base-300 bg-base-100 p-2 shadow-sm"
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
                                    <span className="badge badge-sm badge-neutral">
                                        {ROLE_LABELS[roleKey] ?? roleKey}
                                    </span>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={logout}
                                        className="text-error"
                                        role="menuitem"
                                    >
                                        <LogOut className="size-4" aria-hidden="true" />
                                        Keluar
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">{children}</main>
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
