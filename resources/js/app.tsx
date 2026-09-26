import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AndalasShellLayout from '@/andalas/ShellLayout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

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
