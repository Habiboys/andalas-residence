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
    expect(html).toContain(
        'Per Penghuni (Harga dibagi jumlah kapasitas kamar)',
    );
    expect(html).toContain('Per Kamar (booking full 1 kamar)');
    expect(html).toContain(
        'Per Grup, (bisa mengundang teman kamar yang diinginkan, Harga dibagi jumlah penghuni)',
    );
    expect(html).not.toContain('type="checkbox"');
});

it('displays incoming room invitation alert directly in Step 1 when invited by a friend', () => {
    const html = renderToStaticMarkup(
        <Registration
            initialUser={{ is_kipk: false }}
            room_invitations={[
                {
                    id: 'inv-room-1',
                    incoming: true,
                    status: 'pending',
                    expires_at: '2026-12-01T12:00:00Z',
                    sender_name: 'Budi Santoso',
                    invitee_name: 'Syauqi',
                    room_number: '2A.08',
                    building_name: 'Hijau (G)',
                    floor_name: 'Lantai 2',
                    rate_unit: 'year',
                    estimated_total: 2500000,
                },
            ]}
        />,
    );
    expect(html).toContain(
        'Anda diundang pada kamar Hijau (G) · Lantai 2 · Kamar 2A.08',
    );
    expect(html).toContain('Budi Santoso');
    expect(html).toContain('Terima Undangan &amp; Lanjut ke Tahap 3');
    expect(html).not.toContain('Undangan (');
});

it('hides invitation tab and requires completing housing data before viewing invitations', () => {
    const html = renderToStaticMarkup(
        <Registration
            housingProfileReady={false}
            housingProfileUrl="/mahasiswa/data-hunian"
            initialUser={{ is_kipk: false }}
            room_invitations={[
                {
                    id: 'inv-room-1',
                    incoming: true,
                    status: 'pending',
                    expires_at: '2026-12-01T12:00:00Z',
                    sender_name: 'Budi Santoso',
                    invitee_name: 'Sulhayati',
                    room_number: '2A.08',
                    building_name: 'Hijau (G)',
                    floor_name: 'Lantai 2',
                    rate_unit: 'year',
                    estimated_total: 2500000,
                },
            ]}
        />,
    );
    expect(html).toContain('Lengkapi Data Hunian');
    expect(html).not.toContain('Undangan (1)');
    expect(html).not.toContain('Budi Santoso');
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
        'Terdaftar sebagai pendaftar KIP-K. Sistem menempatkan kamar sesuai prioritas dan kapasitas.',
    );
    expect(html).not.toContain('Katalog kamar');
    expect(html).not.toContain('Dasar tarif');
    expect(html).not.toContain('Riwayat pendaftaran');
});
it('does not render sponsor funding selector on student registration even when can_use_sponsor flag is set', () => {
    const html = renderToStaticMarkup(
        <Registration initialUser={{ can_use_sponsor: true }} />,
    );
    expect(html).not.toContain('Penanggung biaya');
    expect(html).not.toContain('Beasiswa / kampus');
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

it('displays clean KIP-K header without personal debt after disbursement notice', () => {
    const html = renderToStaticMarkup(
        <Registration
            initialUser={{
                is_kipk: true,
                kipk_personal_payment: true,
                student_stage: 'Mahasiswa binaan',
            }}
        />,
    );
    expect(html).toContain(
        'Terdaftar sebagai pendaftar KIP-K. Sistem menempatkan kamar sesuai prioritas dan kapasitas.',
    );
    expect(html).not.toContain('Kewajiban pribadi dibayar setelah pencairan');
    expect(html).not.toContain('Mahasiswa binaan.');
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
                                deskripsi: 'Biaya Asrama 1 Tahun',
                                kuantitas: 1,
                                harga_satuan: 2500000,
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
                                kode_transaksi: 'PAY-1',
                                status: 'menunggu_verifikasi',
                                nominal: 2500000,
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
                                kode_transaksi: 'PAY-1',
                                status: 'lunas',
                                nominal: 2500000,
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

it('displays exact category and closed reason when registration deadline has expired or student belongs to S2/S3 track', () => {
    const expiredHtml = renderToStaticMarkup(
        <Registration
            policy_open={false}
            policy_category="local_non_kipk"
            policy_closed_reason="Batas waktu pendaftaran jalur ini telah berakhir."
        />,
    );

    expect(expiredHtml).toContain('Mahasiswa Lokal Non-KIP-K');
    expect(expiredHtml).toContain(
        'Batas waktu pendaftaran jalur ini telah berakhir.',
    );

    const s2Html = renderToStaticMarkup(
        <Registration
            policy_open={false}
            policy_category="international"
            policy_closed_reason="Pendaftaran kategori ini belum dibuka."
        />,
    );

    expect(s2Html).toContain('Mahasiswa Internasional / S2 / S3');
    expect(s2Html).toContain('Program studi jenjang S2/S3');
});
