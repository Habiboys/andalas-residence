import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import { latestPayment, PaymentStatusBadge } from './PaymentStatusBadge';

it('picks the most recent dated payment as the latest legacy transaction', () => {
    const pembayaran = [
        { status: 'ditolak', tanggal_bayar: '2026-08-01T00:00:00.000Z' },
        { status: 'lunas', tanggal_bayar: '2026-09-01T00:00:00.000Z' },
    ];
    expect(latestPayment(pembayaran)?.status).toBe('lunas');
});

it('keeps a dated payment ahead of an undated one', () => {
    const pembayaran = [
        { status: 'lunas', tanggal_bayar: '2026-09-01T00:00:00.000Z' },
        { status: 'menunggu_verifikasi' },
    ];
    expect(latestPayment(pembayaran)?.status).toBe('lunas');
});

it('shows a fallback badge when a stay has no invoice or payment confirmation', () => {
    const html = renderToStaticMarkup(<PaymentStatusBadge pembayaran={[]} />);
    expect(html).toContain('Belum ada tagihan');
    expect(html).toContain('badge-ghost');
    expect(html).not.toContain('badge-neutral');
});

it('shows a recorded legacy payment without claiming the stay is settled', () => {
    const html = renderToStaticMarkup(
        <PaymentStatusBadge
            pembayaran={[
                {
                    status: 'lunas',
                    nominal: 1500000,
                    tanggal_bayar: '2026-09-01T00:00:00.000Z',
                },
            ]}
        />,
    );
    expect(html).toContain('Pembayaran tercatat');
    expect(html).not.toContain('Lunas');
    expect(html).toContain('1.500.000');
});

it('shows imported payment confirmation without inventing a transaction amount', () => {
    const html = renderToStaticMarkup(
        <PaymentStatusBadge
            confirmation={{
                status: 'confirmed_paid',
                reconciliation_status: 'pending',
            }}
            pembayaran={[]}
        />,
    );
    expect(html).toContain('Sudah membayar - konfirmasi impor');
    expect(html).toContain('Rincian transaksi belum direkonsiliasi');
    expect(html).not.toContain('Belum bayar');
    expect(html).not.toContain('Rp');
});
it.each([
    ['0', 'Belum dibayar', '2.500.000'],
    ['1000000', 'Dibayar sebagian', '1.500.000'],
    ['2500000', 'Lunas', null],
])(
    'calculates settlement from the stay invoice when paid %s',
    (paid, label, remaining) => {
        const html = renderToStaticMarkup(
            <PaymentStatusBadge
                invoice={{
                    status: 'terbit',
                    total: '2500000',
                    total_dibayar: paid!,
                }}
                pembayaran={[{ status: 'lunas', nominal: 1000000 }]}
            />,
        );
        expect(html).toContain(label!);
        if (remaining) expect(html).toContain(remaining);
        else expect(html).not.toContain('Sisa');
    },
);
it('does not let import confirmation hide an outstanding stay invoice', () => {
    const html = renderToStaticMarkup(
        <PaymentStatusBadge
            confirmation={{
                status: 'confirmed_paid',
                reconciliation_status: 'pending',
            }}
            invoice={{
                status: 'sebagian',
                total: '2500000',
                total_dibayar: '1000000',
            }}
        />,
    );
    expect(html).toContain('Dibayar sebagian');
    expect(html).not.toContain('Sudah membayar');
});
it('distinguishes sponsored zero invoices from personal payments', () => {
    const html = renderToStaticMarkup(
        <PaymentStatusBadge
            invoice={{
                status: 'lunas',
                total: 0,
                total_dibayar: 0,
                sponsor_total: 2500000,
            }}
        />,
    );
    expect(html).toContain('Ditanggung sponsor');
    expect(html).not.toContain('Lunas');
});
it.each([
    ['draft', 'Tagihan belum diterbitkan'],
    ['batal', 'Tagihan dibatalkan'],
])('shows %s invoice state independently of a receipt', (status, label) => {
    const html = renderToStaticMarkup(
        <PaymentStatusBadge
            invoice={{ status, total: 2500000, total_dibayar: 0 }}
        />,
    );
    expect(html).toContain(label);
    expect(html).not.toContain('Belum dibayar');
});
