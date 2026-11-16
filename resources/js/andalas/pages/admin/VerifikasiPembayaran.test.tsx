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

it('displays DPUB bank statement archives without blocking verification', () => {
    const html = renderToStaticMarkup(
        <VerifikasiPembayaran
            bank_statements={[
                {
                    id: 'stmt-1',
                    reference: 'RK-BSI-2026-11',
                    source: 'BSI RPL 014',
                    evidence_path: 'documents/dpub/rk.pdf',
                    paid_at: '2026-11-16',
                },
            ]}
            pembayaran={{
                data: [],
                current_page: 1,
                per_page: 10,
                last_page: 1,
                total: 0,
            }}
        />,
    );

    expect(html).toContain('Arsip Rekening Koran DPUB untuk Pencocokan Manual');
    expect(html).toContain('RK-BSI-2026-11');
    expect(html).toContain('BSI RPL 014');
    expect(html).toContain('Preview');
    expect(html).toContain('Unduh');
});
