import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import { AuthProvider } from '../../context/AppContext';
import Dashboard from './Dashboard';

it('gives checked-out residents direct access to letters without a housing registration stepper', () => {
    const html = renderToStaticMarkup(
        <AuthProvider
            initialUser={{
                nim: '2699000001',
                nama: 'Alumni',
                role: 'mahasiswa',
                angkatan: '2026',
                status_huni: 'keluar',
            }}
        >
            <Dashboard />
        </AuthProvider>,
    );
    expect(html).toContain('Layanan bebas asrama');
    expect(html).toContain('tanpa mendaftar kamar kembali');
    expect(html).toContain('Tagihan &amp; pembayaran');
    expect(html).not.toContain('Kamar saya');
    expect(html).not.toContain('Tahapan pendaftaran');
});

it('lets legacy candidates choose the letter service without declaring them checked out', () => {
    const html = renderToStaticMarkup(
        <AuthProvider
            initialUser={{
                nim: '2599000001',
                nama: 'Mahasiswa lama',
                role: 'mahasiswa',
                angkatan: '2025',
                status_huni: 'calon',
                needs_service_selection: true,
            }}
        >
            <Dashboard />
        </AuthProvider>,
    );
    expect(html).toContain('Layanan bebas asrama');
    expect(html).toContain('Daftar hunian kembali');
    expect(html).toContain('calon');
    expect(html).not.toContain('Tahapan pendaftaran');
});
