import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import Sidebar, { NAV_MAP, type UserRole } from './Sidebar';

it('puts the dashboard first for every role with a sidebar', () => {
    for (const groups of Object.values(NAV_MAP)) {
        expect(groups[0]?.items[0]?.page).toBe('dashboard');
    }
});

it.each(['staff_admin', 'superadmin'] as UserRole[])(
    'shows the Data Master navigation as active for %s',
    (role) => {
        const html = renderToStaticMarkup(
            <Sidebar
                role={role}
                currentPage="master-data/fakultas"
                setPage={() => {}}
            />,
        );
        expect(html).toMatch(/aria-current="page"[^>]*>[\s\S]*?Fakultas/);
        expect(html.indexOf('Data Master')).toBeLessThan(
            html.indexOf('Operasional'),
        );
    },
);

it.each([
    'mahasiswa',
    'fasilitator',
    'admin_layanan',
    'admin_aset',
] as UserRole[])(
    'does not advertise an inaccessible Data Master page to %s',
    (role) => {
        const html = renderToStaticMarkup(
            <Sidebar role={role} currentPage="dashboard" setPage={() => {}} />,
        );
        expect(html).not.toContain('Data Master');
    },
);

it.each(['staff_admin', 'admin_layanan', 'superadmin'] as UserRole[])(
    'renders Pengelolaan Pendaftaran as a collapsible submenu for %s',
    (role) => {
        const html = renderToStaticMarkup(
            <Sidebar
                role={role}
                currentPage="residence-workflow/opening"
                setPage={() => {}}
            />,
        );
        expect(html).toContain('Submenu Pengelolaan Pendaftaran');
        expect(html).toMatch(
            /aria-current="page"[^>]*>[\s\S]*?Buka \/ Tutup Pendaftaran/,
        );
    },
);

