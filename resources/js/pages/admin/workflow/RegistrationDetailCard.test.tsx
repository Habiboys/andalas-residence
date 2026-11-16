import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import RegistrationDetailCard from './RegistrationDetailCard';
import type { Registration } from './types';

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
    Form: ({
        children,
        action,
    }: {
        children:
            | ReactNode
            | ((props: {
                  errors: Record<string, string>;
                  processing: boolean;
                  recentlySuccessful: boolean;
              }) => ReactNode);
        action?: string;
    }) => (
        <form action={action}>
            {typeof children === 'function'
                ? children({
                      errors: {},
                      processing: false,
                      recentlySuccessful: false,
                  })
                : children}
        </form>
    ),
    router: {
        post: vi.fn(),
    },
    useForm: (initial: Record<string, unknown>) => ({
        data: initial,
        errors: {},
        processing: false,
        setData: vi.fn(),
        post: vi.fn(),
        reset: vi.fn(),
        transform: vi.fn(),
    }),
}));

function makeRegistration(overrides?: Partial<Registration>): Registration {
    return {
        id: 'reg-1',
        workflow_version: 2,
        status: 'submitted',
        is_kipk: false,
        funding: 'mandiri',
        stay_kind: 'standard',
        rate_unit: 'year',
        student_profile: {
            user: {
                nama: 'Siti Aisyah',
                nim_nip: '2310990001',
            },
        },
        reserved_room: {
            id: 'room-1',
            nomor_kamar: '101',
            kapasitas: 2,
            lantai: {
                gedung: {
                    id: 'b-1',
                    nama_gedung: 'RPX (A)',
                    kode_gedung: 'A',
                },
            },
        },
        allocation_status: 'held',
        policy: {
            id: 'pol-1',
            category: 'local_non_kipk',
            version: 1,
            settings: {
                open: true,
                documents: ['ktp', 'perjanjian'],
                building_ids: ['b-1'],
                rates: [],
                month_days: 30,
                day_basis: 'nights',
                monthly_allowed: false,
            },
        },
        documents: [
            {
                id: 'doc-1',
                kind: 'ktp',
                version: 1,
                path: 'residence-documents/reg-1/ktp.jpg',
                status: 'uploaded',
            },
            {
                id: 'doc-2',
                kind: 'perjanjian',
                version: 1,
                path: 'residence-documents/reg-1/perjanjian.pdf',
                status: 'uploaded',
            },
        ],
        decisions: [],
        blockers: [],
        can_operate: true,
        can_review_documents: true,
        can_submit: false,
        billing_basis: 'person',
        ...overrides,
    };
}

it('shows Preview button, Belum diperiksa badge, and one single batch save button for facilitator review', () => {
    const html = renderToStaticMarkup(
        <RegistrationDetailCard
            r={makeRegistration()}
            manager={false}
            leader={false}
            rooms={[]}
        />,
    );

    expect(html).toContain('Belum diperiksa');
    expect(html.match(/>Preview</g)?.length).toBe(2);
    expect(html).toContain('Simpan Pemeriksaan (2 Dokumen)');
    expect(html.match(/Simpan Pemeriksaan \(/g)?.length).toBe(1);
    expect(html).not.toContain('Simpan pemeriksaan');
});

it('shows Sudah diperiksa badge and reviewer timestamp once documents are reviewed', () => {
    const html = renderToStaticMarkup(
        <RegistrationDetailCard
            r={makeRegistration({
                documents: [
                    {
                        id: 'doc-1',
                        kind: 'ktp',
                        version: 1,
                        path: 'residence-documents/reg-1/ktp.jpg',
                        status: 'valid',
                        reviewed_at: '2026-11-16T09:00:00+07:00',
                        reviewer: { nama: 'Budi Fasilitator' },
                    },
                    {
                        id: 'doc-2',
                        kind: 'perjanjian',
                        version: 1,
                        path: 'residence-documents/reg-1/perjanjian.pdf',
                        status: 'revision',
                        notes: 'Tanda tangan kurang jelas',
                        reviewed_at: '2026-11-16T09:05:00+07:00',
                        reviewer: { nama: 'Budi Fasilitator' },
                    },
                ],
            })}
            manager={false}
            leader={false}
            rooms={[]}
        />,
    );

    expect(html).toContain('Sudah diperiksa');
    expect(html).toContain('Sudah diperiksa · Valid');
    expect(html).toContain('Sudah diperiksa · Perlu revisi');
    expect(html).toContain('Terakhir diperiksa Budi Fasilitator');
    expect(html).toContain('Tanda tangan kurang jelas');
});

it('restricts document review controls to assigned building facilitator', () => {
    const html = renderToStaticMarkup(
        <RegistrationDetailCard
            r={makeRegistration({ can_review_documents: false })}
            manager={true}
            leader={false}
            rooms={[]}
        />,
    );

    expect(html).toContain(
        'Pemeriksaan dan persetujuan berkas pendaftar dilakukan secara eksklusif oleh Fasilitator gedung terkait saat proses verifikasi check-in (tidak menahan tahap pembayaran).',
    );
    expect(html).not.toContain('Simpan Pemeriksaan (');
    expect(html).not.toContain('Keputusan pemeriksaan');
});

it('shows check_in_blockers cleanly and hides check-in form until documents are verified at check-in', () => {
    const html = renderToStaticMarkup(
        <RegistrationDetailCard
            r={makeRegistration({
                blockers: [],
                check_in_blockers: [
                    'Dokumen perjanjian belum diverifikasi valid saat check-in.',
                ],
            })}
            manager={true}
            leader={false}
            rooms={[]}
        />,
    );

    expect(html).toContain('Kendala Persyaratan Check-in:');
    expect(html).toContain(
        'Dokumen perjanjian belum diverifikasi valid saat check-in.',
    );
    expect(html).not.toContain('Konfirmasi check-in dan serah kunci');
});

it('shows payment verification shortcut on detail page for finance/pengelola', () => {
    const registrationWithPendingPayment = makeRegistration({
        allocation_status: 'admin_occupied',
        can_review_documents: false,
        tagihan: {
            id: 'inv-1',
            nomor: 'REG-2026-009',
            total: '2500000',
            total_dibayar: '0',
            sponsor_total: '0',
            sponsor_paid: '0',
            pembayaran: [
                {
                    id: 'pay-1',
                    kode_transaksi: 'PAY-001',
                    nominal: '2500000',
                    status: 'menunggu_verifikasi',
                },
            ],
        },
    });

    const htmlPengelola = renderToStaticMarkup(
        <RegistrationDetailCard
            r={registrationWithPendingPayment}
            manager={true}
            finance={true}
            leader={false}
            rooms={[]}
            role="admin_layanan"
        />,
    );

    expect(htmlPengelola).toContain(
        '1 bukti transfer menunggu verifikasi (PAY-001)',
    );
    expect(htmlPengelola).toContain('Verifikasi Pembayaran');
    expect(htmlPengelola).toContain(
        'Ubah Skema Tagihan &amp; Jadwal Cicilan (ACC Offline Pimpinan)',
    );
    expect(htmlPengelola).toContain(
        'href="/admin_layanan/verifikasi-pembayaran?search=2310990001"',
    );
    expect(htmlPengelola).not.toContain('Rekonsiliasi DPUB');

    const htmlFacilitator = renderToStaticMarkup(
        <RegistrationDetailCard
            r={registrationWithPendingPayment}
            manager={false}
            finance={false}
            leader={false}
            rooms={[]}
            role="fasilitator"
        />,
    );
    expect(htmlFacilitator).not.toContain('Verifikasi Pembayaran');
    expect(htmlFacilitator).not.toContain(
        'Ubah Skema Tagihan &amp; Jadwal Cicilan (ACC Offline Pimpinan)',
    );
});

it('renders registration operational and amendment forms inside modals rather than expandable details toggles', () => {
    const registration = makeRegistration({
        is_kipk: true,
        stay_kind: 'non_student',
        completed_at: '2026-11-12T10:00:00Z',
        room_contract_id: 'rc-1',
        room_contract: {
            id: 'rc-1',
            total: '10000000',
            members: ['reg-1'],
        },
        contract_candidates: [{ id: 'reg-1', name: 'Siti Aisyah' }],
        tagihan: {
            id: 'inv-1',
            nomor: 'REG-2026-010',
            total: '2500000',
            total_dibayar: '0',
            sponsor_total: '0',
            sponsor_paid: '0',
            pembayaran: [],
        },
    });

    const html = renderToStaticMarkup(
        <RegistrationDetailCard
            r={registration}
            manager={true}
            finance={true}
            leader={false}
            rooms={[]}
            role="admin"
        />,
    );

    expect(html).not.toContain(
        '<details class="border-base-300 rounded-lg border p-3"><summary class="cursor-pointer font-medium">Pindah kamar</summary>',
    );
    expect(html).not.toContain(
        '<details class="border-base-300 rounded-lg border p-3"><summary class="cursor-pointer font-medium">Revisi anggota kontrak bersama</summary>',
    );
    expect(html).not.toContain(
        '<details class="border-base-300 rounded-lg border p-3"><summary class="cursor-pointer font-medium">Catat bukti transfer penyewa umum</summary>',
    );
    expect(html).not.toContain(
        '<details class="border-base-300 rounded-lg border p-3"><summary class="cursor-pointer font-medium">Pengembalian kunci</summary>',
    );
    expect(html).not.toContain(
        '<details class="border-base-300 rounded-lg border p-3"><summary class="cursor-pointer font-medium">Catat pencairan KIP-K</summary>',
    );
    expect(html).toContain('Pindah Kamar');
    expect(html).toContain('Revisi Anggota Kontrak Bersama');
    expect(html).toContain('Catat Bukti Transfer Penyewa Umum');
    expect(html).toContain('Pengembalian Kunci &amp; Pemeriksaan Kamar');
    expect(html).toContain('Catat Pencairan KIP-K');
    expect(html).toContain('<dialog class="modal');
});
