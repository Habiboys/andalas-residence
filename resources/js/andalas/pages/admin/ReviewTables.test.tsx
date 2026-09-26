import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import RegistrationReview from './RegistrationReview';
import VerifikasiPembayaran from './VerifikasiPembayaran';
it('limits placement approval to sponsored registrations', () => {
    const html = renderToStaticMarkup(
        <RegistrationReview
            registrations={[
                {
                    id: 'one',
                    status: 'submitted',
                    is_kipk: false,
                    funding: 'personal',
                },
            ]}
        />,
    );
    expect(html).toContain(
        'Pembayaran pribadi menyelesaikan pendaftaran secara otomatis',
    );
    expect(html).not.toContain('Sahkan dan selesaikan');
});
it('allows staff to place verified KIPK recipients', () => {
    const html = renderToStaticMarkup(
        <RegistrationReview
            registrations={[
                {
                    id: 'one',
                    status: 'submitted',
                    is_kipk: true,
                    funding: 'sponsor',
                    sponsor_name: 'KIP-K',
                },
            ]}
        />,
    );
    expect(html).toContain('Pilih kamar KIP-K');
    expect(html).toContain('Sahkan dan selesaikan penempatan');
});
it('keeps completed payment history without editable verification forms', () => {
    const html = renderToStaticMarkup(
        <VerifikasiPembayaran
            pembayaran={[
                {
                    id: 'one',
                    nominal: 1000,
                    status: 'lunas',
                    mahasiswa: {
                        user: { nama: 'Sudah Bayar', nim_nip: '26100001' },
                    },
                },
                { id: 'two', nominal: 1000, status: 'ditolak' },
            ]}
        />,
    );
    expect(html).toContain('Sudah Bayar');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('Ajukan cicilan');
});
