import { createInertiaApp, router } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AndalasShellLayout from '@/andalas/ShellLayout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

const PROTECTED_PREFIXES = [
    '/admin',
    '/mahasiswa',
    '/fasilitator',
    '/go',
    '/teknisi',
    '/pimpinan',
    '/admin_layanan',
    '/admin_aset',
    '/orang_tua',
    '/settings',
    '/pelaporan',
    '/pekerjaan-teknisi',
    '/residence-process',
    '/dashboard',
];

function isProtectedPath(pathname: string): boolean {
    return PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
}

function registerBackAfterLogoutGuard(): void {
    if (typeof window === 'undefined') {
        return;
    }

    const LOGOUT_MARKER = 'andalas_logged_out';

    if (isProtectedPath(window.location.pathname)) {
        try {
            window.sessionStorage.removeItem(LOGOUT_MARKER);
        } catch {
            // Ignore storage errors.
        }
    }

    window.addEventListener('pageshow', (event: PageTransitionEvent) => {
        const navEntries = window.performance?.getEntriesByType?.(
            'navigation',
        ) as PerformanceNavigationTiming[] | undefined;
        const isBackForward = navEntries?.[0]?.type === 'back_forward';
        const loggedOut =
            (() => {
                try {
                    return window.sessionStorage.getItem(LOGOUT_MARKER) === '1';
                } catch {
                    return false;
                }
            })() || false;

        if (isProtectedPath(window.location.pathname)) {
            if (loggedOut) {
                window.location.replace('/login');
            } else if (event.persisted || isBackForward) {
                window.location.reload();
            }
        }
    });

    window.addEventListener('popstate', () => {
        try {
            if (
                window.sessionStorage.getItem(LOGOUT_MARKER) === '1' &&
                isProtectedPath(window.location.pathname)
            ) {
                window.location.replace('/login');
            }
        } catch {
            // Ignore storage errors.
        }
    });

    router.on('before', (event) => {
        try {
            if (
                window.sessionStorage.getItem(LOGOUT_MARKER) === '1' &&
                isProtectedPath(event.detail.visit.url.pathname)
            ) {
                event.preventDefault();
                window.location.replace('/login');
            }
        } catch {
            // Ignore storage errors.
        }
    });
}

registerBackAfterLogoutGuard();

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
            case name.startsWith('mahasiswa/'):
            case name.startsWith('admin/'):
            case name.startsWith('fasilitator/'):
            case name.startsWith('teknisi/'):
            case name.startsWith('pimpinan/'):
            case name.startsWith('admin_layanan/'):
            case name.startsWith('admin_aset/'):
            case name.startsWith('go/'):
            case name.startsWith('orang_tua/'):
            case name.startsWith('settings/'):
                return [AndalasShellLayout];
            case name.startsWith('landing/'):
            case name.startsWith('auth/'):
                return null;
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: 'var(--color-primary)',
    },
});

// This will set light / dark mode on load...
initializeTheme();
