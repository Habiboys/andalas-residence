import {
    StatCard,
    StatusBadge,
} from '@/andalas/components/ui';
import { formatRupiah } from '@/andalas/lib/format';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import ApplicationsTab from './workflow/ApplicationsTab';
import ContractsTab from './workflow/ContractsTab';
import FinanceTab from './workflow/FinanceTab';
import PoliciesTab from './workflow/PoliciesTab';
import PublicTab from './workflow/PublicTab';
import RegistrationDetailCard from './workflow/RegistrationDetailCard';
import {
    CATEGORY_LABELS,
    WORKFLOW_STATUS_LABELS,
    type WorkflowProps,
} from './workflow/types';

export default function ResidenceWorkflowPage(props: WorkflowProps) {
    const tab = props.section ?? 'registrations';
    const { errors } = usePage().props;

    const [searchQuery, setSearchQuery] = useState(
        props.filters?.search ?? '',
    );
    const [statusFilter, setStatusFilter] = useState(
        props.filters?.status ?? '',
    );
    const [categoryFilter, setCategoryFilter] = useState(
        props.filters?.category ?? '',
    );

    const detailRegistration = props.detailMode
        ? (props.registrations.data[0] ?? null)
        : null;

    const pendingContracts =
        props.pendingRoomContracts && props.pendingRoomContracts.length > 0
            ? props.pendingRoomContracts
            : props.registrations.data.filter(
                  (r) =>
                      r.billing_basis === 'room' &&
                      !r.room_contract_id &&
                      !r.completed_at &&
                      r.status !== 'rejected',
              );

    const sectionTitles: Record<string, { title: string; subtitle: string }> = {
        registrations: {
            title: 'Proses Pendaftaran',
            subtitle:
                'Administrasi, pembiayaan, check-in fisik, dan pengembalian kunci.',
        },
        opening: {
            title: 'Buka / Tutup Pendaftaran',
            subtitle:
                'Kelola pembukaan pendaftaran per kategori penghuni berdasarkan kesiapan Gedung & Kamar.',
        },
        applications: {
            title: 'Permohonan Institusi, S2/S3 & Kegiatan',
            subtitle:
                'Catat permohonan mahasiswa internasional, pascasarjana mandiri, dan peserta Summer Course.',
        },
        public: {
            title: 'Pendaftaran Penyewa Umum',
            subtitle:
                'Pencatatan, daftar hunian aktif, dan alokasi kamar untuk penyewa umum non-mahasiswa.',
        },
        finance: {
            title: 'Rekonsiliasi DPUB & Invoice Institusi',
            subtitle:
                'Pencocokan bukti pembayaran resmi DPUB dan penerbitan invoice gabungan institusi.',
        },
        contracts: {
            title: 'Penerbitan Tagihan Kamar Bersama',
            subtitle:
                'Undangan teman sekamar dilakukan antar penghuni. Sahkan anggota per kamar untuk membagi tagihan kamar.',
        },
    };

    const currentHeader = sectionTitles[tab] ?? sectionTitles.registrations;

    const summaryCards: Array<{
        key: string;
        label: string;
        color: 'green' | 'gold' | 'red' | 'gray';
        currency?: boolean;
    }> = [
        { key: 'applicants', label: 'Pendaftar', color: 'gray' },
        { key: 'allocated', label: 'Alokasi belum masuk', color: 'gold' },
        { key: 'ready', label: 'Siap check-in', color: 'green' },
        { key: 'occupants', label: 'Penghuni tercatat', color: 'green' },
        {
            key: 'historical',
            label: 'Histori perlu konfirmasi',
            color: 'gold',
        },
        {
            key: 'physical',
            label: 'Penghuni fisik terkonfirmasi',
            color: 'green',
        },
        {
            key: 'receivables',
            label: 'Piutang pribadi & institusi',
            color: 'red',
            currency: true,
        },
        {
            key: 'credits',
            label: 'Kredit lebih bayar',
            color: 'gold',
            currency: true,
        },
    ];

    function applyRegistrationFilters(e?: React.FormEvent) {
        e?.preventDefault();
        const params: Record<string, string> = {};
        if (searchQuery.trim()) {
            params.search = searchQuery.trim();
        }
        if (statusFilter) {
            params.status = statusFilter;
        }
        if (categoryFilter) {
            params.category = categoryFilter;
        }
        router.get('/residence-process', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function resetFilters() {
        setSearchQuery('');
        setStatusFilter('');
        setCategoryFilter('');
        router.get(
            '/residence-process',
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <div className="space-y-5">
            <Head title={currentHeader.title} />

            <header className="space-y-1">
                <h1 className="text-2xl font-bold">
                    {props.detailMode
                        ? `Detail Pengajuan — ${detailRegistration?.student_profile.user.nama ?? ''}`
                        : currentHeader.title}
                </h1>
                <p className="text-base-content/70 text-sm">
                    {props.detailMode
                        ? `NIM ${detailRegistration?.student_profile.user.nim_nip ?? '—'} · Pemeriksaan berkas, pembiayaan, dan check-in penghuni.`
                        : currentHeader.subtitle}
                </p>
            </header>

            {Object.entries(errors ?? {}).map(([key, error]) => (
                <p key={key} className="alert alert-error" role="alert">
                    {String(error)}
                </p>
            ))}

            {tab === 'registrations' && !props.detailMode && (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {summaryCards
                            .filter((item) => item.key in props.summary)
                            .map((item) => (
                                <StatCard
                                    key={item.key}
                                    label={item.label}
                                    value={
                                        item.currency
                                            ? formatRupiah(
                                                  props.summary[item.key] ?? 0,
                                              )
                                            : (props.summary[item.key] ?? 0)
                                    }
                                    color={item.color}
                                />
                            ))}
                    </div>

                    {props.manager && (
                        <ContractsTab
                            pendingContracts={pendingContracts}
                            compact
                        />
                    )}
                </>
            )}

            {tab === 'registrations' && (
                <div className="space-y-4">
                    {props.detailMode && detailRegistration ? (
                        <RegistrationDetailCard
                            rooms={props.rooms}
                            r={detailRegistration}
                            manager={props.manager}
                            leader={props.leader}
                        />
                    ) : (
                        <div className="bg-base-100 border-base-300 space-y-4 rounded-xl border p-4 shadow-xs">
                            <form
                                onSubmit={applyRegistrationFilters}
                                className="flex flex-wrap items-center gap-2"
                            >
                                <input
                                    type="search"
                                    className="input input-bordered input-sm w-full max-w-xs"
                                    placeholder="Cari nama, NIM, gedung, atau kamar..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                />
                                <select
                                    aria-label="Filter status pengajuan"
                                    className="select select-bordered select-sm"
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(e.target.value)
                                    }
                                >
                                    <option value="">Semua status</option>
                                    <option value="submitted">Diajukan</option>
                                    <option value="accepted">Diterima</option>
                                    <option value="checked_in">
                                        Sudah check-in
                                    </option>
                                    <option value="keys_returned">
                                        Kunci kembali
                                    </option>
                                    <option value="rejected">Ditolak</option>
                                </select>
                                <select
                                    aria-label="Filter kategori penghuni"
                                    className="select select-bordered select-sm"
                                    value={categoryFilter}
                                    onChange={(e) =>
                                        setCategoryFilter(e.target.value)
                                    }
                                >
                                    <option value="">Semua kategori</option>
                                    {Object.entries(CATEGORY_LABELS).map(
                                        ([val, label]) => (
                                            <option key={val} value={val}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </select>
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-sm"
                                >
                                    Terapkan
                                </button>
                                {(props.filters?.search ||
                                    props.filters?.status ||
                                    props.filters?.category) && (
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={resetFilters}
                                    >
                                        Reset
                                    </button>
                                )}
                            </form>

                            {props.registrations.data.length === 0 ? (
                                <p className="text-base-content/70 py-4 text-sm">
                                    Belum ada pendaftaran yang cocok dengan
                                    filter atau lingkup akses Anda.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="table-zebra table w-full text-sm">
                                        <thead>
                                            <tr>
                                                <th>Mahasiswa / Penghuni</th>
                                                <th>Kategori &amp; Skema</th>
                                                <th>Kamar</th>
                                                <th>Status &amp; Syarat</th>
                                                <th className="text-right">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {props.registrations.data.map(
                                                (r) => (
                                                    <tr key={r.id}>
                                                        <td>
                                                            <div className="font-semibold">
                                                                {
                                                                    r
                                                                        .student_profile
                                                                        .user
                                                                        .nama
                                                                }
                                                            </div>
                                                            <div className="text-base-content/60 text-xs">
                                                                {
                                                                    r
                                                                        .student_profile
                                                                        .user
                                                                        .nim_nip
                                                                }
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div>
                                                                {r.policy
                                                                    ?.category
                                                                    ? (CATEGORY_LABELS[
                                                                          r
                                                                              .policy
                                                                              .category
                                                                      ] ??
                                                                      r.policy
                                                                          .category)
                                                                    : r.is_kipk
                                                                      ? 'Lokal KIP-K'
                                                                      : 'Reguler'}
                                                            </div>
                                                            <div className="text-base-content/60 text-xs">
                                                                {r.rate_unit ===
                                                                'day'
                                                                    ? 'Harian'
                                                                    : r.rate_unit ===
                                                                        'month'
                                                                      ? 'Bulanan'
                                                                      : 'Tahunan'}{' '}
                                                                ·{' '}
                                                                {r.billing_basis ===
                                                                'room'
                                                                    ? 'Per kamar'
                                                                    : 'Per orang'}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {r.reserved_room ? (
                                                                <span>
                                                                    {
                                                                        r
                                                                            .reserved_room
                                                                            .lantai
                                                                            ?.gedung
                                                                            ?.nama_gedung
                                                                    }{' '}
                                                                    · Kamar{' '}
                                                                    {
                                                                        r
                                                                            .reserved_room
                                                                            .nomor_kamar
                                                                    }
                                                                </span>
                                                            ) : (
                                                                <span className="text-base-content/60">
                                                                    Menunggu
                                                                    alokasi
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <StatusBadge
                                                                status={
                                                                    r.completed_at
                                                                        ? 'aktif'
                                                                        : r.status
                                                                }
                                                                label={
                                                                    r.keys_returned_at
                                                                        ? 'Kunci kembali'
                                                                        : r.checked_in_at
                                                                          ? 'Menghuni'
                                                                          : (WORKFLOW_STATUS_LABELS[
                                                                                r
                                                                                    .status
                                                                            ] ??
                                                                            r.status)
                                                                }
                                                            />
                                                            {r.blockers.length >
                                                            0 ? (
                                                                <span className="text-warning mt-1 block text-xs">
                                                                    {
                                                                        r
                                                                            .blockers
                                                                            .length
                                                                    }{' '}
                                                                    kendala
                                                                    syarat
                                                                </span>
                                                            ) : (
                                                                <span className="text-success mt-1 block text-xs">
                                                                    {r.completed_at
                                                                        ? 'Aktif / selesai'
                                                                        : 'Siap check-in'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="text-right">
                                                            <Link
                                                                href={`/residence-process/registrations/${r.id}`}
                                                                className="btn btn-primary btn-xs"
                                                            >
                                                                Detail
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {props.registrations.last_page > 1 && (
                        <nav
                            className="flex flex-wrap gap-2"
                            aria-label="Halaman pendaftaran"
                        >
                            {props.registrations.links.map(
                                (link, i) =>
                                    link.url && (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            className={`btn btn-sm ${link.active ? 'btn-primary' : 'btn-ghost'}`}
                                        >
                                            {link.label
                                                .replace(/&laquo;/g, '‹')
                                                .replace(/&raquo;/g, '›')}
                                        </Link>
                                    ),
                            )}
                        </nav>
                    )}
                </div>
            )}

            {tab === 'public' && (
                <PublicTab rooms={props.rooms} stays={props.publicStays} />
            )}

            {tab === 'opening' && (
                <PoliciesTab
                    buildings={props.buildings}
                    policyCatalog={props.policyCatalog}
                    masterHousingUrl={props.masterHousingUrl}
                    policies={props.policies}
                    templates={props.templates ?? []}
                />
            )}

            {tab === 'applications' && (
                <ApplicationsTab
                    rooms={props.rooms}
                    programs={props.programs}
                    items={props.applications}
                />
            )}

            {tab === 'finance' && (
                <FinanceTab
                    proofs={props.paymentProofs}
                    references={props.reconciliations}
                    invoices={props.invoices}
                    groups={props.invoiceGroups}
                    applicationItems={props.applications}
                />
            )}

            {tab === 'contracts' && (
                <ContractsTab pendingContracts={pendingContracts} />
            )}
        </div>
    );
}
