import { useEffect, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import { ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { ThemeProvider, useTheme } from "../context/AppContext";

export type LandingSharedProps = {
    profilSections: Record<string, string>;
    informasiMenu: string[];
};

type Props = {
    active?: string;
    children: React.ReactNode;
};

const INFORMASI_LABEL: Record<string, string> = {
    regulasi: "Regulasi",
    sop: "SOP",
    panduan: "Panduan",
    pengumuman: "Pengumuman",
};

function ThemeToggle() {
    const { darkMode, toggleDarkMode } = useTheme();

    return (
        <button
            type="button"
            onClick={toggleDarkMode}
            className="btn btn-ghost btn-sm"
            aria-label={darkMode ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
            aria-pressed={darkMode}
        >
            {darkMode ? (
                <Sun className="size-4" aria-hidden="true" />
            ) : (
                <Moon className="size-4" aria-hidden="true" />
            )}
        </button>
    );
}

export default function LandingLayout({ active, children }: Props) {
    const { props } = usePage();
    const { profilSections, informasiMenu } = props as unknown as LandingSharedProps;
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });

        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Both menus are real menus: Escape dismisses them without a pointer.
    useEffect(() => {
        if (!openDropdown && !menuOpen) {
            return;
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpenDropdown(null);
                setMenuOpen(false);
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [openDropdown, menuOpen]);

    const linkClass = (name: string) =>
        `text-sm font-medium transition-colors ${
            active === name ? "text-primary" : "text-base-content hover:text-primary"
        }`;

    const profilEntries = Object.entries(profilSections ?? {}) as [string, string][];
    const informasiEntries = informasiMenu ?? [];

    return (
        <ThemeProvider>
            <div className="min-h-screen overflow-x-hidden bg-base-100">
                {/*
                 * A solid bar, not a floating blurred pill. Glass over an unknown
                 * hero is a contrast gamble, and the blur only paid off as
                 * decoration. The shadow appears on scroll because that is when
                 * the bar actually needs to separate from the content under it.
                 */}
                <nav
                    className={`fixed inset-x-0 top-0 z-50 border-b border-base-300 bg-base-100 ${
                        scrolled ? "shadow-sm" : ""
                    }`}
                >
                    <div className="navbar mx-auto min-h-16 max-w-6xl gap-2 px-4">
                        <div className="navbar-start">
                            <Link href="/" className="flex items-center gap-2.5">
                                <img
                                    src="/images/logo-andalas-residence.png"
                                    alt=""
                                    className="h-10 w-auto shrink-0"
                                />
                                {/* Below sm the wordmark wraps to three lines and crowds
                                    the controls, so the logo carries the brand on its own. */}
                                <span className="hidden leading-tight sm:block">
                                    <span className="block font-serif text-sm whitespace-nowrap text-base-content">
                                        Andalas Residence
                                    </span>
                                    <span className="block text-xs whitespace-nowrap text-muted">
                                        Universitas Andalas
                                    </span>
                                </span>
                            </Link>
                        </div>

                        <div className="navbar-end hidden gap-6 lg:flex">
                            <Link href="/" className={linkClass("beranda")}>
                                Beranda
                            </Link>

                            <div
                                className={`dropdown dropdown-hover dropdown-end ${
                                    openDropdown === "profil" ? "dropdown-open" : ""
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setOpenDropdown(openDropdown === "profil" ? null : "profil")
                                    }
                                    className={`${linkClass("profil")} inline-flex items-center gap-1`}
                                    aria-haspopup="menu"
                                    aria-expanded={openDropdown === "profil"}
                                >
                                    Profil
                                    <ChevronDown className="size-3.5" aria-hidden="true" />
                                </button>
                                <ul
                                    className="menu dropdown-content z-50 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-sm"
                                    role="menu"
                                >
                                    {profilEntries.map(([key, title]) => (
                                        <li key={key}>
                                            <Link
                                                href={`/profil/${key}`}
                                                onClick={() => setOpenDropdown(null)}
                                                role="menuitem"
                                            >
                                                {title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Link href="/unit" className={linkClass("unit")}>
                                Unit
                            </Link>

                            <div
                                className={`dropdown dropdown-hover dropdown-end ${
                                    openDropdown === "informasi" ? "dropdown-open" : ""
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setOpenDropdown(
                                            openDropdown === "informasi" ? null : "informasi",
                                        )
                                    }
                                    className={`${linkClass("informasi")} inline-flex items-center gap-1`}
                                    aria-haspopup="menu"
                                    aria-expanded={openDropdown === "informasi"}
                                >
                                    Informasi
                                    <ChevronDown className="size-3.5" aria-hidden="true" />
                                </button>
                                <ul
                                    className="menu dropdown-content z-50 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-sm"
                                    role="menu"
                                >
                                    {informasiEntries.map((cat) => (
                                        <li key={cat}>
                                            <Link
                                                href={`/informasi/${cat}`}
                                                onClick={() => setOpenDropdown(null)}
                                                role="menuitem"
                                            >
                                                {INFORMASI_LABEL[cat] ?? cat}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Link href="/program" className={linkClass("program")}>
                                Program
                            </Link>
                            <Link href="/kontak" className={linkClass("kontak")}>
                                Kontak
                            </Link>

                            <div className="flex items-center gap-2">
                                <ThemeToggle />
                                <Link href="/login" className="btn btn-primary btn-sm">
                                    Masuk
                                </Link>
                            </div>
                        </div>

                        <div className="navbar-end gap-1 lg:hidden">
                            <ThemeToggle />
                            <button
                                type="button"
                                onClick={() => setMenuOpen((o) => !o)}
                                className="btn btn-ghost min-h-11 min-w-11 lg:btn-sm"
                                aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
                                aria-expanded={menuOpen}
                            >
                                {menuOpen ? (
                                    <X className="size-5" aria-hidden="true" />
                                ) : (
                                    <Menu className="size-5" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>

                    {menuOpen && (
                        <div className="border-t border-base-300 bg-base-100 lg:hidden">
                            <ul className="menu w-full gap-0.5 p-3">
                                <li>
                                    <Link href="/" onClick={() => setMenuOpen(false)}>
                                        Beranda
                                    </Link>
                                </li>
                                <li className="menu-title">Profil</li>
                                {profilEntries.map(([key, title]) => (
                                    <li key={key}>
                                        <Link
                                            href={`/profil/${key}`}
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            {title}
                                        </Link>
                                    </li>
                                ))}
                                <li>
                                    <Link href="/unit" onClick={() => setMenuOpen(false)}>
                                        Unit
                                    </Link>
                                </li>
                                <li className="menu-title">Informasi</li>
                                {informasiEntries.map((cat) => (
                                    <li key={cat}>
                                        <Link
                                            href={`/informasi/${cat}`}
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            {INFORMASI_LABEL[cat] ?? cat}
                                        </Link>
                                    </li>
                                ))}
                                <li>
                                    <Link href="/program" onClick={() => setMenuOpen(false)}>
                                        Program
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/kontak" onClick={() => setMenuOpen(false)}>
                                        Kontak
                                    </Link>
                                </li>
                                <li className="mt-2">
                                    <Link
                                        href="/login"
                                        onClick={() => setMenuOpen(false)}
                                        className="btn btn-primary btn-sm"
                                    >
                                        Masuk
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    )}
                </nav>

                <div className="pt-16">{children}</div>

                <footer className="border-t border-base-300 bg-base-200">
                    <div className="mx-auto max-w-6xl px-6 py-14">
                        <div className="flex flex-col gap-12 md:flex-row md:gap-20">
                            <div className="shrink-0">
                                <img
                                    src="/images/logo-andalas-residence.png"
                                    alt=""
                                    className="mb-4 h-12 w-auto"
                                />
                                <p className="max-w-52 text-xs leading-relaxed text-muted">
                                    Asrama mahasiswa Universitas Andalas, hunian untuk mendukung
                                    aktivitas belajar dan pembinaan karakter.
                                </p>
                            </div>

                            {/* Three groups because the site has three groups of links,
                                not four because a template footer does. */}
                            <div className="grid flex-1 grid-cols-2 gap-8 md:grid-cols-3">
                                <div>
                                    <h2 className="mb-3 text-sm font-semibold">Profil</h2>
                                    <ul className="flex flex-col gap-2 text-sm text-muted">
                                        {profilEntries.map(([key, title]) => (
                                            <li key={key}>
                                                <Link
                                                    href={`/profil/${key}`}
                                                    className="transition-colors hover:text-primary"
                                                >
                                                    {title}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h2 className="mb-3 text-sm font-semibold">Informasi</h2>
                                    <ul className="flex flex-col gap-2 text-sm text-muted">
                                        {informasiEntries.map((cat) => (
                                            <li key={cat}>
                                                <Link
                                                    href={`/informasi/${cat}`}
                                                    className="transition-colors hover:text-primary"
                                                >
                                                    {INFORMASI_LABEL[cat] ?? cat}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h2 className="mb-3 text-sm font-semibold">Navigasi</h2>
                                    <ul className="flex flex-col gap-2 text-sm text-muted">
                                        <li>
                                            <Link
                                                href="/unit"
                                                className="transition-colors hover:text-primary"
                                            >
                                                Unit
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href="/program"
                                                className="transition-colors hover:text-primary"
                                            >
                                                Program
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href="/kontak"
                                                className="transition-colors hover:text-primary"
                                            >
                                                Kontak
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-base-300 pt-6 md:flex-row">
                            <span className="text-xs text-muted">
                                © {new Date().getFullYear()} Andalas Residence, Universitas Andalas
                            </span>
                            <ThemeToggle />
                        </div>
                    </div>
                </footer>
            </div>
        </ThemeProvider>
    );
}
