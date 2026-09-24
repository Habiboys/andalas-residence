import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import RegistrationReview from './RegistrationReview';
import VerifikasiPembayaran from './VerifikasiPembayaran';

it('lists registration statuses and opens reviews through row actions instead of inline forms', () => {
    const html = renderToStaticMarkup(
        <RegistrationReview
            registrations={[
                {
                    id: 'one',
                    status: 'submitted',
                    is_kipk: false,
                    student_profile: {
                        user: { nama: 'Mahasiswa Satu', nim_nip: '2699000001' },
                    },
                },
                { id: 'two', status: 'accepted', is_kipk: true },
            ]}
        />,
    );
    for (const text of [
        'Semua (2)',
        'Menunggu verifikasi (1)',
        'Diterima (1)',
        'Mahasiswa Satu',
        'Lihat detail',
        'Baris per halaman',
    ])
        expect(html).toContain(text);
    expect(html).not.toContain('Verifikasi data');
    expect(html).not.toContain('Terima dan tempatkan');
});

it('keeps payment history accessible and removes inline installment approval forms', () => {
    const html = renderToStaticMarkup(
        <VerifikasiPembayaran
            pembayaran={[
                {
                    id: 'one',
                    status: 'lunas',
                    mahasiswa: { user: { nama: 'Sudah Bayar' } },
                },
                {
                    id: 'two',
                    status: 'ditolak',
                    mahasiswa: { user: { nama: 'Bukti Ditolak' } },
                },
            ]}
            billing={[
                {
                    id: 'invoice',
                    nomor: 'INV-1',
                    total: '1000',
                    total_dibayar: '0',
                    status: 'terbit',
                    cicilan_diminta_at: '2026-09-24',
                },
            ]}
        />,
    );
    for (const text of [
        'Cicilan',
        'Terverifikasi (1)',
        'Ditolak (1)',
        'Sudah Bayar',
        'Bukti Ditolak',
        'Lihat detail',
    ])
        expect(html).toContain(text);
    expect(html).not.toContain('Simpan persetujuan cicilan');
    expect(html).not.toContain('Nominal termin');
});
