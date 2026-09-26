import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vite-plus/test';
import VerifikasiDokumen from './verifikasi-dokumen';

vi.mock('@inertiajs/react', () => ({
    Head: ({ children }: { children: ReactNode }) => <>{children}</>,
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string;
        children: ReactNode;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

it('shows the published document details for a valid token', () => {
    const html = renderToStaticMarkup(
        <VerifikasiDokumen
            valid
            reason={null}
            document={{
                nomor: 'SBA/UNAND/2026/0001',
                jenis: 'SURAT KETERANGAN BEBAS ASRAMA',
                nama: 'Mahasiswa Satu',
                nim: '2599000001',
                fakultas: 'Fakultas Teknik',
                program: 'Teknik Informatika',
                status: 'general',
                tanggal_terbit: '26 September 2026',
                penandatangan: 'Dr. Ir. Budi Santoso, M.T.',
                nip_penandatangan: '197505121994031002',
                template: 'residence-snapshot-v4',
                checksum: 'a1b2c3d4e5f60718',
            }}
        />,
    );

    for (const text of [
        'Dokumen ini sah',
        'SBA/UNAND/2026/0001',
        'Mahasiswa Satu',
        '2599000001',
        'Fakultas Teknik',
        'Dr. Ir. Budi Santoso, M.T.',
        '197505121994031002',
    ]) {
        expect(html).toContain(text);
    }
});

it('explains why an unverified token cannot be trusted', () => {
    const html = renderToStaticMarkup(
        <VerifikasiDokumen
            valid={false}
            document={null}
            reason="Token verifikasi tidak dikenal. Pastikan surat berasal dari penerbit resmi."
        />,
    );

    expect(html).toContain('Dokumen tidak dapat diverifikasi');
    expect(html).toContain('Token verifikasi tidak dikenal');
    expect(html).not.toContain('SURAT KETERANGAN');
});
