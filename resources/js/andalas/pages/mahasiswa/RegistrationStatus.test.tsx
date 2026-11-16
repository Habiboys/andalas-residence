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
    expect(html).toContain('Menunggu Pemeriksaan Petugas');
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
