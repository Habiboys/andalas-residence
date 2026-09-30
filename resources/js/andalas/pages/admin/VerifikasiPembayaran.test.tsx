import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import VerifikasiPembayaran from './VerifikasiPembayaran';

it('shows payments in a table and opens verification only on demand', () => {
    const html = renderToStaticMarkup(
        <VerifikasiPembayaran
            pembayaran={{
                data: [
                    {
                        id: 'payment-1',
                        kode_transaksi: 'TRX-001',
                        nominal: 250000,
                        status: 'menunggu_verifikasi',
                        mahasiswa: {
                            user: {
                                nama: 'Mahasiswa Contoh',
                                nim_nip: '22001001',
                            },
                        },
                        tagihan: { nomor: 'INV-001' },
                    },
                ],
                current_page: 1,
                per_page: 10,
                last_page: 1,
                total: 1,
            }}
        />,
    );

    expect(html).toContain('<table');
    expect(html).toContain('No.');
    expect(html).toContain('TRX-001');
    expect(html).toContain('Mahasiswa Contoh');
    expect(html).toContain('Verifikasi');
    expect(html).not.toContain('Simpan verifikasi');
});
