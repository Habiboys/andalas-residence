import { useEffect, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Menu, Moon, Sun, X } from 'lucide-react';
import { login } from '@/routes';
import { redirect as dashboardRedirect } from '@/routes/dashboard';
import { ThemeProvider, useTheme } from '../context/AppContext';

export type LandingSharedProps = {
    auth?: { user: { id: number | string } | null };
    profilSections: Record<string, string>;
    informasiMenu: string[];
};

type Props = {
    active?: string;
    children: React.ReactNode;
};

const INFORMASI_LABEL: Record<string, string> = {
    regulasi: 'Regulasi',
    sop: 'SOP',
    panduan: 'Panduan',
    pengumuman: 'Pengumuman',
};

function ThemeToggle({ onLight = false }: { onLight?: boolean }) {
    const { darkMode, toggleDarkMode } = useTheme();

    return (
        <button
            type="button"
            onClick={toggleDarkMode}
            className={`btn btn-ghost btn-sm ${
                onLight ? 'text-white hover:bg-white/10' : ''
            }`}
            aria-label={
                darkMode ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'
            }
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
    const { profilSections, informasiMenu, auth } =
        props as unknown as LandingSharedProps;
    const accountHref = auth?.user ? dashboardRedirect() : login();
    const accountLabel = auth?.user ? 'Dashboard' : 'Masuk';
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Both menus are real menus: Escape dismisses them without a pointer.
    useEffect(() => {
        if (!openDropdown && !menuOpen) {
            return;
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpenDropdown(null);
                setMenuOpen(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [openDropdown, menuOpen]);

    // Over the hero the bar is transparent with light copy; once scrolled (or on
    // internal pages) it becomes a solid white bar, like profile-akademik.
    const solid = scrolled || !active;

    const linkClass = (name: string) =>
        `text-sm font-medium transition-colors ${
            !solid
                ? 'text-white hover:text-white/80'
                : active === name
                  ? 'text-primary'
                  : 'text-base-content hover:text-primary'
        }`;

    const profilEntries = Object.entries(profilSections ?? {}) as [
        string,
        string,
    ][];
    const informasiEntries = informasiMenu ?? [];

    return (
        <ThemeProvider>
            <div className="bg-mist text-base-content min-h-svh overflow-x-hidden font-sans">
                <header
                    className={`fixed inset-x-0 top-0 z-50 ${
                        solid ? 'bg-surface shadow-sm' : 'bg-transparent'
                    }`}
                >
                    <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 md:h-[4.5rem] md:px-6">
                        <Link
                            href="/"
                            className="flex min-w-0 items-center gap-3"
                        >
                            <img
                                src="/images/logo-andalas-residence.png"
                                alt=""
                                className="h-10 w-auto shrink-0"
                            />
                            {/* Below sm the wordmark wraps to three lines and crowds
                                the controls, so the logo carries the brand on its own. */}
                            <span className="hidden min-w-0 leading-tight sm:block">
                                <span
                                    className={`font-display block truncate text-sm md:text-base ${solid ? 'text-base-content' : 'text-white'}`}
                                >
                                    Andalas Residence
                                </span>
                                <span
                                    className={`block truncate text-xs font-normal ${solid ? 'text-base-content/70' : 'text-white/90'}`}
                                >
                                    Universitas Andalas
                                </span>
                            </span>
                        </Link>

                        <nav
                            className="hidden items-center gap-8 lg:flex"
                            aria-label="Navigasi utama"
                        >
                            <Link href="/" className={linkClass('beranda')}>
                                Beranda
                            </Link>

                            <div
                                className={
                                    openDropdown === 'profil'
                                        ? 'dropdown dropdown-open'
                                        : 'dropdown'
                                }
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setOpenDropdown(
                                            openDropdown === 'profil'
                                                ? null
                                                : 'profil',
                                        )
                                    }
                                    className={`${linkClass('profil')} inline-flex items-center gap-1`}
                                    aria-haspopup="menu"
                                    aria-expanded={openDropdown === 'profil'}
                                >
                                    Profil
                                    <ChevronDown
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                </button>
                                <ul
                                    className="menu dropdown-content border-base-200 bg-surface text-base-content z-50 mt-2 w-56 rounded-md border p-2 shadow-lg"
                                    role="menu"
                                >
                                    {profilEntries.map(([key, title]) => (
                                        <li key={key}>
                                            <Link
                                                href={`/profil/${key}`}
                                                onClick={() =>
                                                    setOpenDropdown(null)
                                                }
                                                role="menuitem"
                                                className="text-sm"
                                            >
                                                {title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Link href="/unit" className={linkClass('unit')}>
                                Unit
                            </Link>

                            <div
                                className={
                                    openDropdown === 'informasi'
                                        ? 'dropdown dropdown-open'
                                        : 'dropdown'
                                }
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setOpenDropdown(
                                            openDropdown === 'informasi'
                                                ? null
                                                : 'informasi',
                                        )
                                    }
                                    className={`${linkClass('informasi')} inline-flex items-center gap-1`}
                                    aria-haspopup="menu"
                                    aria-expanded={openDropdown === 'informasi'}
                                >
                                    Informasi
                                    <ChevronDown
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                </button>
                                <ul
                                    className="menu dropdown-content border-base-200 bg-surface text-base-content z-50 mt-2 w-56 rounded-md border p-2 shadow-lg"
                                    role="menu"
                                >
                                    {informasiEntries.map((cat) => (
                                        <li key={cat}>
                                            <Link
                                                href={`/informasi/${cat}`}
                                                onClick={() =>
                                                    setOpenDropdown(null)
                                                }
                                                role="menuitem"
                                                className="text-sm"
                                            >
                                                {INFORMASI_LABEL[cat] ?? cat}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Link
                                href="/program"
                                className={linkClass('program')}
                            >
                                Program
                            </Link>
                            <Link
                                href="/kontak"
                                className={linkClass('kontak')}
                            >
                                Kontak
                            </Link>

                            <div className="flex items-center gap-2">
                                <ThemeToggle onLight={!solid} />
                                <Link
                                    href={accountHref}
                                    className={
                                        solid
                                            ? 'btn btn-primary btn-sm'
                                            : 'btn btn-sm border border-white/70 bg-transparent text-white hover:bg-white/10'
                                    }
                                >
                                    {accountLabel}
                                </Link>
                            </div>
                        </nav>

                        <div className="flex items-center gap-1 lg:hidden">
                            <ThemeToggle onLight={!solid} />
                            <button
                                type="button"
                                onClick={() => setMenuOpen((o) => !o)}
                                className={`btn btn-ghost lg:btn-sm min-h-11 min-w-11 ${
                                    !solid ? 'text-white' : ''
                                }`}
                                aria-label={
                                    menuOpen ? 'Tutup menu' : 'Buka menu'
                                }
                                aria-expanded={menuOpen}
                            >
                                {menuOpen ? (
                                    <X className="size-5" aria-hidden="true" />
                                ) : (
                                    <Menu
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                )}
                            </button>
                        </div>
                    </div>

                    {menuOpen && (
                        <div className="border-base-200 bg-surface border-t lg:hidden">
                            <ul className="menu text-base-content w-full gap-0.5 p-3">
                                <li>
                                    <Link
                                        href="/"
                                        onClick={() => setMenuOpen(false)}
                                    >
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
                                    <Link
                                        href="/unit"
                                        onClick={() => setMenuOpen(false)}
                                    >
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
                                    <Link
                                        href="/program"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        Program
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/kontak"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        Kontak
                                    </Link>
                                </li>
                                <li className="mt-2">
                                    <Link
                                        href={accountHref}
                                        onClick={() => setMenuOpen(false)}
                                        className="btn btn-primary btn-sm"
                                    >
                                        {accountLabel}
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    )}
                </header>

                {children}

                <footer className="bg-hero-footer text-white">
                    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:grid-cols-2 md:px-6 lg:grid-cols-12 lg:gap-12">
                        <div className="lg:col-span-4">
                            <img
                                src="/images/logo-andalas-residence.png"
                                alt=""
                                className="mb-4 h-12 w-auto"
                            />
                            <p className="max-w-md text-sm leading-relaxed text-white/75">
                                Asrama mahasiswa Universitas Andalas, hunian
                                untuk mendukung aktivitas belajar dan pembinaan
                                karakter.
                            </p>
                        </div>

                        <div className="grid flex-1 grid-cols-2 gap-8 sm:col-span-2 lg:col-span-8 lg:grid-cols-3">
                            <div>
                                <h2 className="mb-3 text-sm font-semibold text-white">
                                    Profil
                                </h2>
                                <ul className="flex flex-col gap-2 text-sm text-white/80">
                                    {profilEntries.map(([key, title]) => (
                                        <li key={key}>
                                            <Link
                                                href={`/profil/${key}`}
                                                className="transition-colors hover:text-white"
                                            >
                                                {title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h2 className="mb-3 text-sm font-semibold text-white">
                                    Informasi
                                </h2>
                                <ul className="flex flex-col gap-2 text-sm text-white/80">
                                    {informasiEntries.map((cat) => (
                                        <li key={cat}>
                                            <Link
                                                href={`/informasi/${cat}`}
                                                className="transition-colors hover:text-white"
                                            >
                                                {INFORMASI_LABEL[cat] ?? cat}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h2 className="mb-3 text-sm font-semibold text-white">
                                    Navigasi
                                </h2>
                                <ul className="flex flex-col gap-2 text-sm text-white/80">
                                    <li>
                                        <Link
                                            href="/unit"
                                            className="transition-colors hover:text-white"
                                        >
                                            Unit
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/program"
                                            className="transition-colors hover:text-white"
                                        >
                                            Program
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/kontak"
                                            className="transition-colors hover:text-white"
                                        >
                                            Kontak
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">
                        © {new Date().getFullYear()} Andalas Residence,
                        Universitas Andalas
                    </div>
                </footer>
            </div>
        </ThemeProvider>
    );
}
