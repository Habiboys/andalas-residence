import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import Invoices from './Invoices';

it('shows a single invoice heading and keeps the unpaid badge text contained', () => {
    const html = renderToStaticMarkup(
        <Invoices
            billing={[
                {
                    id: 'invoice-1',
                    nomor: 'INV-1',
                    status: 'terbit',
                    total: '100000',
                    total_dibayar: '0',
                    sponsor_total: '0',
                    sponsor_paid: '0',
                    mahasiswa_id: 'student-1',
                    created_at: '2026-10-07',
                },
            ]}
        />,
    );
    expect(html).toContain('belum lunas');
    expect(html).toContain('whitespace-nowrap');
    expect(html).not.toContain('>Daftar invoice</h2>');
    expect(html).toContain('Nama administrasi Andalas Residence');
});

it('provides PDF download without the redundant manual payment entry action', () => {
    const html = renderToStaticMarkup(
        <Invoices
            groups={[
                {
                    id: 'group-1',
                    nomor: 'GAB-1',
                    payer_type: 'personal',
                    invoice_ids: [],
                    snapshot: {
                        total: 100000,
                        institution: 'Universitas Andalas',
                    },
                },
            ]}
        />,
    );
    expect(html).toContain('Unduh PDF GAB-1');
    expect(html).not.toContain('Catat pembayaran GAB-1');
});
