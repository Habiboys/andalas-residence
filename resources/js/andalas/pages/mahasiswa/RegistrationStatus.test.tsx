import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import RegistrationStatus from './RegistrationStatus';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string;
        children: ReactNode;
        className?: string;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: {
        visit: vi.fn(),
        post: vi.fn(),
    },
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

const sampleRegistration = {
    id: 'reg-1',
    status: 'submitted',
    workflow_version: 2,
    can_submit: true,
    blockers: [
        'Dokumen perjanjian belum valid.',
        'Pembayaran awal atau persetujuan pembiayaan belum memenuhi syarat.',
    ],
    reserved_room: {
        id: 'room-1',
        nomor_kamar: '2A.07',
        lantai: {
            gedung: {
                nama_gedung: 'Hijau (G)',
            },
        },
    },
    student_profile: {
        user: {
            nama: 'Muhammad Nouval Habibie',
            nim_nip: '2211521020',
        },
    },
    policy: {
        category: 'local_non_kipk',
        settings: {
            documents: ['perjanjian'],
        },
    },
    documents: [
        {
            id: 'doc-1',
            kind: 'perjanjian',
            version: 1,
            status: 'uploaded',
        },
    ],
    decisions: [
        {
            id: 'dec-1',
            kind: 'installment',
            status: 'pending',
            reason: 'Kendala biaya awal semester',
        },
    ],
    tagihan: {
        id: 'inv-1',
        nomor: 'REG-01a1d424',
        total: 10000000,
        total_dibayar: 0,
        status: 'terbit',
    },
};

it('renders calm neutral surfaces without pastel box floods or bright multi-color badges', () => {
    const html = renderToStaticMarkup(
        <RegistrationStatus
            registrations={{
                data: [sampleRegistration],
                last_page: 1,
                links: [],
            }}
            templates={[
                {
                    id: 'tpl-1',
                    category: 'local_non_kipk',
                    kind: 'perjanjian',
                    original_name: 'Template.pdf',
                },
            ]}
        />,
    );

    expect(html).toContain('Pendaftaran asrama Anda sudah tercatat di sistem');
    expect(html).toContain('Terdaftar · Dalam Proses Administrasi');
    expect(html).toContain('Terunggah · Verifikasi Saat Check-in');
    expect(html).toContain('Menunggu pembayaran');
    expect(html).toContain('Menunggu persetujuan');
    expect(html).not.toContain('bg-success/10');
    expect(html).not.toContain('bg-warning/10');
    expect(html).not.toContain('bg-primary/5');
    expect(html).not.toContain('bg-info/10');
    expect(html).not.toContain('badge-info');
    expect(html).not.toContain('badge-warning');
    expect(html).not.toContain('badge-success');
    expect(html).not.toContain('btn-warning');
    expect(html).not.toContain('text-success');
    expect(html).not.toContain('text-warning font-semibold');
});

it('hides upload and financing inputs once saved permanently until revision is requested', () => {
    const html = renderToStaticMarkup(
        <RegistrationStatus
            registrations={{
                data: [sampleRegistration],
                last_page: 1,
                links: [],
            }}
        />,
    );

    expect(html).toContain('Berkas sudah tersimpan permanen');
    expect(html).toContain('Pilihan pembiayaan telah tersimpan permanen');
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain('Pilih Skema Pembiayaan');
});

it('does not allow students to submit installment or deferral requests online inside the system', () => {
    const regWithoutDecision = {
        ...sampleRegistration,
        decisions: [],
    };
    const html = renderToStaticMarkup(
        <RegistrationStatus
            registrations={{
                data: [regWithoutDecision],
                last_page: 1,
                links: [],
            }}
        />,
    );

    expect(html).not.toContain('Ajukan cicilan (persetujuan pimpinan)');
    expect(html).not.toContain(
        'Ajukan penundaan pembayaran (persetujuan pimpinan)',
    );
    expect(html).not.toContain('Pengajuan cicilan atau penundaan pembayaran');
    expect(html).not.toContain('Skema Pembayaran');
});

it('shows payment upload immediately after document upload without blocker banner or waiting for check-in verification', () => {
    const readyToPay = {
        ...sampleRegistration,
        payment_unlocked: true,
        tagihan: {
            ...sampleRegistration.tagihan,
            nomor: 'REG-2211521020',
            items: [
                {
                    id: 'item-1',
                    deskripsi: 'Sewa Asrama 1 Tahun',
                    kuantitas: 1,
                    harga_satuan: 10000000,
                    jumlah: 10000000,
                },
            ],
        },
        blockers: [
            'Pembayaran awal atau verifikasi pembayaran oleh pengelola belum memenuhi syarat.',
        ],
        decisions: [
            {
                id: 'dec-full',
                kind: 'full',
                status: 'approved',
                reason: 'Pembayaran penuh sesuai tagihan.',
            },
        ],
    };

    const html = renderToStaticMarkup(
        <RegistrationStatus
            registrations={{
                data: [readyToPay],
                last_page: 1,
                links: [],
            }}
        />,
    );

    expect(html).toContain(
        'Berkas terunggah! Silakan selesaikan pembayaran sesuai tagihan',
    );
    expect(html).toContain('Kembali ke Tahap Sebelumnya');
    expect(html).toContain('REG-2211521020');
    expect(html).toContain('Rincian Tagihan');
    expect(html).toContain('Sewa Asrama 1 Tahun');
    expect(html).toContain('Unggah Bukti Pembayaran');
    expect(html).toContain(
        'Tanggal dan Jam Pembayaran (Harus Sesuai dengan Bukti Bayar)',
    );
    expect(html).not.toContain('Berkas Pendaftaran');
    expect(html).not.toContain('Detail Tagihan &amp; Pembayaran');
    expect(html).not.toContain('Buka Halaman Detail Tagihan');
    expect(html).not.toContain('Lihat Detail Tagihan');
    expect(html).not.toContain('Bayar Penuh Sesuai Tagihan');
    expect(html).not.toContain('Syarat yang perlu dilengkapi');
    expect(html).not.toContain('Tahap Pembayaran Belum Dibuka');
});

it('shows all uploaded documents and billing details with Belum Check-in badge in Step 5 before facilitator verification', () => {
    const step5Pending = {
        ...sampleRegistration,
        payment_unlocked: true,
        completed_at: null,
        decisions: [
            {
                id: 'dec-full',
                kind: 'full',
                status: 'approved',
                reason: 'Pembayaran penuh sesuai tagihan.',
            },
        ],
        tagihan: {
            ...sampleRegistration.tagihan,
            nomor: 'REG-2211521020',
            items: [
                {
                    id: 'item-1',
                    deskripsi: 'Sewa Asrama 1 Tahun',
                    kuantitas: 1,
                    harga_satuan: 10000000,
                    jumlah: 10000000,
                },
            ],
            pembayaran: [
                {
                    id: 'pay-1',
                    kode_transaksi: 'PAY-1',
                    status: 'menunggu_verifikasi',
                    nominal: 10000000,
                    nama_bank: 'BSI',
                    nomor_rekening_pengirim: '7001122334',
                    atas_nama_pengirim: 'Muhammad Nouval Habibie',
                    tanggal_bayar: '2026-11-17T08:00:00Z',
                },
            ],
        },
    };

    const html = renderToStaticMarkup(
        <RegistrationStatus
            registrations={{
                data: [step5Pending],
                last_page: 1,
                links: [],
            }}
        />,
    );

    expect(html).toContain('Belum Check-in');
    expect(html).toContain('Berkas Pendaftaran');
    expect(html).toContain('Pembiayaan &amp; Tagihan');
    expect(html).toContain('REG-2211521020');
    expect(html).not.toContain('Detail Tagihan &amp; Pembayaran');
    expect(html).not.toContain('Buka Halaman Detail Tagihan');
});
