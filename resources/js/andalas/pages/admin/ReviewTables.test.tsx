import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import RegistrationReview from './RegistrationReview';
import VerifikasiPembayaran from './VerifikasiPembayaran';
it('limits placement approval to sponsored registrations', () => {
    const html = renderToStaticMarkup(
        <RegistrationReview
            registrations={{
                data: [
                    {
                        id: 'one',
                        status: 'submitted',
                        is_kipk: false,
                        funding: 'personal',
                    },
                ],
                current_page: 1,
                per_page: 10,
                last_page: 1,
                total: 1,
            }}
        />,
    );
    expect(html).toContain('Kelola');
    expect(html).not.toContain('Sahkan dan selesaikan');
});
it('allows staff to place verified KIPK recipients', () => {
    const html = renderToStaticMarkup(
        <RegistrationReview
            registrations={{
                data: [
                    {
                        id: 'one',
                        status: 'submitted',
                        is_kipk: true,
                        funding: 'sponsor',
                        sponsor_name: 'KIP-K',
                    },
                ],
                current_page: 1,
                per_page: 10,
                last_page: 1,
                total: 1,
            }}
        />,
    );
    expect(html).toContain('Kelola');
    expect(html).not.toContain('Pilih kamar KIP-K');
    expect(html).not.toContain('Sahkan pendaftaran');
});
it('keeps completed payment history without editable verification forms', () => {
    const html = renderToStaticMarkup(
        <VerifikasiPembayaran
            pembayaran={{
                data: [
                    {
                        id: 'one',
                        nominal: 1000,
                        status: 'lunas',
                        mahasiswa: {
                            user: { nama: 'Sudah Bayar', nim_nip: '26100001' },
                        },
                    },
                    { id: 'two', nominal: 1000, status: 'ditolak' },
                ],
                current_page: 1,
                per_page: 10,
                last_page: 1,
                total: 2,
            }}
        />,
    );
    expect(html).toContain('Sudah Bayar');
    expect(html).not.toContain('Simpan verifikasi');
    expect(html).not.toContain('Ajukan cicilan');
});
