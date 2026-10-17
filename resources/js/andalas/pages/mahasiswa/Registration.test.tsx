import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import Registration from './Registration';
vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    usePage: () => ({ props: { roomTypeCatalog: [] } }),
}));

it('automatically displays the active period without offering an inactive choice', () => {
    const html = renderToStaticMarkup(
        <Registration
            periode={[
                { id: 'active', nama_periode: '2026 Ganjil', status: 'aktif' },
                { id: 'old', nama_periode: '2025 Genap', status: 'nonaktif' },
            ]}
        />,
    );
    expect(html).toContain('2026 Ganjil');
    expect(html).not.toContain('2025 Genap');
    expect(html).not.toContain('Pilih periode aktif');
});
it('explains closed admission and disables submission when no active period exists', () => {
    const html = renderToStaticMarkup(<Registration />);
    expect(html).toContain('Pendaftaran belum dibuka');
    expect(html).toContain('disabled=""');
});
it('offers room selection and daily or period pricing for personal registration', () => {
    const html = renderToStaticMarkup(
        <Registration initialUser={{ is_kipk: false }} />,
    );
    expect(html).toContain('Katalog kamar');
    expect(html).toContain('Per hari');
    expect(html).toContain('Per tahun');
    expect(html).toContain('Per orang');
    expect(html).toContain('Per kamar (seluruh kamar)');
    expect(html).not.toContain('type="checkbox"');
});
it('blocks another application while a submitted registration is pending', () => {
    for (const status of ['draft', 'rejected', 'submitted']) {
        const html = renderToStaticMarkup(
            <Registration registration={[{ id: 'one', status }]} />,
        );
        expect(html.includes('Pendaftaran sedang diproses')).toBe(
            status === 'submitted',
        );
    }
});
it('skips room choice for a server verified KIPK recipient', () => {
    const html = renderToStaticMarkup(
        <Registration initialUser={{ is_kipk: true }} />,
    );
    expect(html).toContain('Kamar ditempatkan Admin Layanan');
    expect(html).not.toContain('Katalog kamar');
    expect(html).not.toContain('Dasar tarif');
});
it('requires sponsor verification instead of claiming free residence from account category', () => {
    const html = renderToStaticMarkup(
        <Registration initialUser={{ can_use_sponsor: true }} />,
    );
    expect(html).toContain('Penanggung biaya');
    expect(html).toContain('Beasiswa / kampus');
});
it('requires checkout before an active resident can register again', () => {
    const html = renderToStaticMarkup(
        <Registration initialUser={{ status_huni: 'aktif' }} />,
    );
    expect(html).toContain('Selesaikan check-out');
    expect(html).not.toContain('<form');
});
it('allows a letter inactive account to start a new residence application', () => {
    const html = renderToStaticMarkup(
        <Registration initialUser={{ inactive_reason: 'letter_issued' }} />,
    );
    expect(html).toContain('Arsip surat tetap tersedia');
    expect(html).toContain('<form');
});

it('explains the personal payment exception while retaining administrator room allocation for KIPK 2026', () => {
    const html = renderToStaticMarkup(
        <Registration
            initialUser={{ is_kipk: true, kipk_personal_payment: true }}
        />,
    );
    expect(html).toContain('Khusus KIP-K angkatan 2026');
    expect(html).toContain('unggah bukti pembayaran');
    expect(html).toContain('Kamar ditempatkan Admin Layanan');
    expect(html).not.toContain('Katalog kamar');
});
it('waits for room allocation before directing a personal KIPK applicant to payment', () => {
    const html = renderToStaticMarkup(
        <Registration
            initialUser={{ is_kipk: true, kipk_personal_payment: true }}
            registration={[
                {
                    id: 'pending',
                    status: 'submitted',
                    is_kipk: true,
                    funding: 'personal',
                    tagihan_id: null,
                },
            ]}
        />,
    );
    expect(html).toContain('Menunggu admin menentukan kamar');
    expect(html).not.toContain('Lihat tagihan dan bayar');
});
