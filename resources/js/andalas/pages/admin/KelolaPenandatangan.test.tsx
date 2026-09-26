import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import KelolaPenandatangan from './KelolaPenandatangan';

it('marks the active signer and only offers actions allowed by status', () => {
    const html = renderToStaticMarkup(
        <KelolaPenandatangan
            signers={[
                {
                    id: 1,
                    nama: 'Dr. Ir. Budi Santoso, M.T.',
                    nip: '197505121994031002',
                    jabatan: 'Pengelola Asrama',
                    unit: 'Universitas Andalas',
                    aktif: true,
                },
                {
                    id: 2,
                    nama: 'Dr. Sinta Wijaya, M.Si.',
                    nip: null,
                    jabatan: 'Kepala Bagian Asrama',
                    unit: 'Universitas Andalas',
                    aktif: false,
                },
            ]}
        />,
    );

    for (const text of [
        'Dr. Ir. Budi Santoso, M.T.',
        '197505121994031002',
        'Dr. Sinta Wijaya, M.Si.',
        'Aktif',
        'Cadangan',
        'Simpan penandatangan',
    ]) {
        expect(html).toContain(text);
    }
});

it('renders an empty state when no signer exists yet', () => {
    const html = renderToStaticMarkup(<KelolaPenandatangan signers={[]} />);

    expect(html).toContain('Belum ada penandatangan');
});
