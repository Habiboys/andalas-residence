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
    expect(html).toContain('Tahapan pendaftaran');
    expect(html).toContain('Lanjut ke pilihan kamar');
    expect(html).not.toContain('Katalog kamar');
    expect(html).toContain('Per hari');
    expect(html).toContain('Per tahun');
    expect(html).toContain('Per orang');
    expect(html).toContain('Per kamar (seluruh kamar)');
    expect(html).not.toContain('type="checkbox"');
});
it('blocks another application while a submitted registration is pending and ignores cancelled registrations', () => {
    for (const status of ['draft', 'rejected', 'cancelled', 'submitted']) {
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
    expect(html).toContain(
        'Sistem mengalokasikan kamar sesuai prioritas dan kapasitas.',
    );
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

it('explains KIPK eligibility before disbursement without marking its debt paid', () => {
    const html = renderToStaticMarkup(
        <Registration
            initialUser={{ is_kipk: true, kipk_personal_payment: true }}
        />,
    );
    expect(html).toContain('Check-in diperbolehkan setelah alokasi');
    expect(html).toContain(
        'Pembayaran tetap tercatat terutang sampai dana diterima.',
    );
    expect(html).toContain(
        'Sistem mengalokasikan kamar sesuai prioritas dan kapasitas.',
    );
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
    expect(html).toContain('Menunggu alokasi kamar');
    expect(html).not.toContain('Lihat tagihan dan bayar');
});

it('embeds the 5-step registration flow advancing directly to Pembayaran and Check-in without doc approval lock', () => {
    const html = renderToStaticMarkup(
        <Registration
            housingStatusUrl="/mahasiswa/registration/status"
            registration={[
                {
                    id: 'pending-1',
                    status: 'submitted',
                    is_kipk: false,
                    funding: 'personal',
                    payment_unlocked: true,
                    tagihan_id: 'inv-1',
                    tagihan: {
                        id: 'inv-1',
                        nomor: 'REG-2211523012',
                        total: 2500000,
                        total_dibayar: 0,
                        status: 'terbit',
                        items: [
                            {
                                id: 'it-1',
                                keterangan: 'Biaya Asrama 1 Tahun',
                                jumlah: 2500000,
                            },
                        ],
                    },
                    periode: { nama_periode: '2026/2027' },
                },
            ]}
        />,
    );
    expect(html).toContain('Rencana hunian');
    expect(html).toContain('Pilih kamar');
    expect(html).toContain('Upload berkas');
    expect(html).toContain('Pembayaran');
    expect(html).toContain('Check-in (Verifikasi)');
    expect(html).not.toContain('Berkas Pendaftaran');
    expect(html).toContain('Kembali ke Tahap Sebelumnya');
    expect(html).toContain('REG-2211523012');
    expect(html).toContain('Rincian Tagihan');
    expect(html).toContain('Pembiayaan &amp; Tagihan');
    expect(html).not.toContain('/mahasiswa/tagihan/');
    expect(html).not.toContain('Verifikasi &amp; Pembayaran');
    expect(html).not.toContain('Lihat status dan dokumen pengajuan');
    expect(html).not.toContain('Lihat tagihan dan bayar');
    expect(html).not.toContain('Dokumen &amp; Pembiayaan →');
});

it('keeps the 5-step view visible with Belum Check-in and uploaded files once payment proof is submitted', () => {
    const html = renderToStaticMarkup(
        <Registration
            initialUser={{ status_huni: 'aktif' }}
            housingStatusUrl="/mahasiswa/registration/status"
            registration={[
                {
                    id: 'step5-pending-1',
                    status: 'submitted',
                    workflow_version: 2,
                    is_kipk: false,
                    funding: 'personal',
                    payment_unlocked: true,
                    completed_at: null,
                    documents: [
                        {
                            id: 'doc-1',
                            kind: 'perjanjian',
                            version: 1,
                            status: 'uploaded',
                        },
                    ],
                    tagihan_id: 'inv-1',
                    tagihan: {
                        id: 'inv-1',
                        nomor: 'REG-2211523012',
                        total: 2500000,
                        total_dibayar: 0,
                        status: 'terbit',
                        pembayaran: [
                            {
                                id: 'pay-1',
                                status: 'menunggu_verifikasi',
                                jumlah: 2500000,
                            },
                        ],
                    },
                    periode: { nama_periode: '2026/2027' },
                },
            ]}
        />,
    );

    expect(html).toContain('Belum Check-in');
    expect(html).toContain('Berkas Pendaftaran');
    expect(html).toContain('Pembiayaan &amp; Tagihan');
    expect(html).not.toContain('Anda masih menghuni asrama');
});

it('keeps the 5-step view visible with Sudah Check-in Penghuni Aktif after facilitator verification', () => {
    const html = renderToStaticMarkup(
        <Registration
            initialUser={{ status_huni: 'aktif' }}
            housingStatusUrl="/mahasiswa/registration/status"
            registration={[
                {
                    id: 'step5-done-1',
                    status: 'submitted',
                    workflow_version: 2,
                    is_kipk: false,
                    funding: 'personal',
                    payment_unlocked: true,
                    completed_at: '2026-11-17T08:00:00Z',
                    documents: [
                        {
                            id: 'doc-1',
                            kind: 'perjanjian',
                            version: 1,
                            status: 'approved',
                        },
                    ],
                    tagihan_id: 'inv-1',
                    tagihan: {
                        id: 'inv-1',
                        nomor: 'REG-2211523012',
                        total: 2500000,
                        total_dibayar: 2500000,
                        status: 'lunas',
                        pembayaran: [
                            {
                                id: 'pay-1',
                                status: 'verified',
                                jumlah: 2500000,
                            },
                        ],
                    },
                    periode: { nama_periode: '2026/2027' },
                },
            ]}
        />,
    );

    expect(html).toContain('Sudah Check-in · Penghuni Aktif');
    expect(html).toContain('Berkas Pendaftaran');
    expect(html).toContain('Pembiayaan &amp; Tagihan');
    expect(html).not.toContain('Anda masih menghuni asrama');
});

it('hides standalone status button and avoids promoting installment scheme information', () => {
    const html = renderToStaticMarkup(
        <Registration
            housingStatusUrl="/mahasiswa/registration/status"
            policy_open
            periode={[
                { id: 'active', nama_periode: '2026/2027', status: 'aktif' },
            ]}
            registration={[
                {
                    id: 'cancelled-1',
                    status: 'cancelled',
                    is_kipk: false,
                    funding: 'personal',
                    periode: { nama_periode: '2026/2027' },
                },
            ]}
        />,
    );

    expect(html).not.toContain('Lihat status dan dokumen pengajuan');
    expect(html).not.toContain('Pengajuan cicilan atau penundaan pembayaran');
});
