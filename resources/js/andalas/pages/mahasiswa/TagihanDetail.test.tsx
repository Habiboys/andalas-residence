import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import TagihanDetail from './TagihanDetail';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        className,
    }: {
        href: string;
        children: ReactNode;
        className?: string;
    }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
    useForm: (initial: Record<string, unknown>) => ({
        data: initial,
        errors: {},
        processing: false,
        progress: null,
        setData: vi.fn(),
        post: vi.fn(),
        reset: vi.fn(),
    }),
}));

const baseInvoice = {
    id: 'inv-1',
    nomor: 'REG-2026-001',
    jenis: 'sewa_asrama',
    total: 2500000,
    total_dibayar: 0,
    status: 'terbit',
    jatuh_tempo: '2026-11-20',
    items: [
        {
            id: 'item-1',
            deskripsi: 'Sewa Kamar Standar 1 Tahun',
            kuantitas: 1,
            harga_satuan: 2500000,
            jumlah: 2500000,
        },
    ],
    jadwal_cicilan: [],
    dokumen: [],
};

const sampleAccounts = [
    {
        id: 'acc-1',
        bank_name: 'Bank Nagari',
        account_number: '2100020199999',
        account_name: 'RPL 014 UNAND Asrama',
        instructions: 'Cantumkan NIM pada berita transfer.',
        is_active: true,
    },
];

it('gates payment upload until documents are approved by building facilitator', () => {
    const html = renderToStaticMarkup(
        <TagihanDetail
            invoice={baseInvoice}
            payment_accounts={sampleAccounts}
            registration={{
                id: 'reg-1',
                status: 'submitted',
                payment_unlocked: false,
                blockers: ['Dokumen perjanjian belum disetujui fasilitator gedung.'],
            }}
        />,
    );

    expect(html).toContain('Pembayaran Menunggu Persetujuan Berkas');
    expect(html).toContain('2100020199999');
    expect(html).not.toContain('Kirim Bukti Pembayaran');
});

it('shows destination bank accounts, deadline countdown, and proof upload form when unlocked', () => {
    const html = renderToStaticMarkup(
        <TagihanDetail
            invoice={baseInvoice}
            payment_accounts={sampleAccounts}
            registration={{
                id: 'reg-1',
                status: 'submitted',
                payment_unlocked: true,
                reservation_expires_at: new Date(
                    Date.now() + 3600 * 1000,
                ).toISOString(),
            }}
        />,
    );

    expect(html).toContain('Bank Nagari');
    expect(html).toContain('2100020199999');
    expect(html).toContain('Unggah Bukti Pembayaran');
    expect(html).toContain('Rekening Tujuan Pengiriman');
    expect(html).toContain('Bank Pengirim');
    expect(html).toContain('Nomor Rekening Pengirim');
    expect(html).toContain('Atas Nama Pengirim');
    expect(html).toContain('Jumlah Pembayaran');
    expect(html).toContain('Tanggal dan Jam Pembayaran');
    expect(html).toContain('Upload Bukti Bayar');
    expect(html).toContain('Kirim Bukti Pembayaran');
});

it('shows pending verification status and hides duplicate upload when proof is awaiting manager check', () => {
    const html = renderToStaticMarkup(
        <TagihanDetail
            invoice={baseInvoice}
            payment_accounts={sampleAccounts}
            payments={[
                {
                    id: 'pay-1',
                    kode_transaksi: 'PUB-12345',
                    nominal: 2500000,
                    rekening_tujuan: 'Bank Nagari · 2100020199999 · a.n. RPL 014 UNAND Asrama',
                    nama_bank: 'BNI',
                    nomor_rekening_pengirim: '0987654321',
                    atas_nama_pengirim: 'Mahasiswa Uji',
                    tanggal_bayar: '2026-11-16T05:05:00+07:00',
                    status: 'menunggu_verifikasi',
                },
            ]}
            registration={{
                id: 'reg-1',
                status: 'submitted',
                payment_unlocked: true,
            }}
        />,
    );

    expect(html).toContain('Menunggu Verifikasi Pengelola');
    expect(html).toContain('PUB-12345');
    expect(html).toContain('Rekening tujuan');
    expect(html).toContain('0987654321');
    expect(html).not.toContain('Kirim Bukti Pembayaran');
});
