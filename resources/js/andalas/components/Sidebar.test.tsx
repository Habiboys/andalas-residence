import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import Sidebar, { type UserRole } from './Sidebar';

it.each(['staff_admin', 'superadmin'] as UserRole[])(
    'shows the Data Master navigation as active for %s',
    (role) => {
        const html = renderToStaticMarkup(
            <Sidebar
                role={role}
                currentPage="master-data"
                setPage={() => {}}
            />,
        );
        expect(html).toMatch(/aria-current="page"[^>]*>[\s\S]*?Data Master/);
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
