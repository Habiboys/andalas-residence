import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    Card,
    DataTable,
    inputClass,
    PageHeader,
    StatusBadge,
    type DataColumn,
    type DataTableQuery,
} from '../../components/ui';
import { Modal } from '../../components/atoms/Modal';
import { approve, evidence, surat } from '@/routes/andalas/pengajuan/bebas';
import { approvalBebasAsrama as adminPage } from '@/routes/admin';
import { approvalBebasAsrama as adminLayananPage } from '@/routes/admin_layanan';

type Row = {
    id: string;
    nomor_pengajuan: string;
    status: string;
    created_at?: string;
    legacy_verification_path?: string;
    payment_evidence_path?: string;
    bank_statement_path?: string;
    file_surat_path?: string;
    catatan_penolakan?: string;
    nomor_surat_resmi?: string;
    mahasiswa?: { user?: { nama: string; nim_nip: string } };
};

type PaginatedRows = {
    data: Row[];
    current_page: number;
    per_page: number;
    last_page: number;
    total: number;
};

type TableState = {
    search: string;
    status: string;
    sort_by: string | null;
    sort_direction: 'asc' | 'desc';
    error?: string | null;
};

function verificationLabel(path?: string): string {
    if (path === 'not_alumni') {
        return 'Tidak pernah tinggal';
    }
    if (path === 'alumni_paid') {
        return 'Alumni, mengaku sudah lunas';
    }
    if (path === 'alumni_unpaid') {
        return 'Alumni, belum lunas';
    }

    return 'Pemeriksaan administrasi';
}

function formatDate(value?: string): string {
    if (!value) {
        return 'Tidak tersedia';
    }

    return new Date(value).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export default function ApprovalPengajuan({
    bebas_asrama,
    table_state = {
        search: '',
        status: '',
        sort_by: 'created_at',
        sort_direction: 'desc',
    },
    role = 'staff_admin',
}: {
    bebas_asrama?: PaginatedRows;
    table_state?: TableState;
    role?: string;
}) {
    const [selected, setSelected] = useState<Row | null>(null);
    const [tableLoading, setTableLoading] = useState(false);
    const [requestError, setRequestError] = useState<string | null>(null);
    const rows = bebas_asrama?.data ?? [];
    const tableQuery = {
        search: table_state.search,
        page: bebas_asrama?.current_page ?? 1,
        perPage: bebas_asrama?.per_page ?? 10,
        sortBy: table_state.sort_by,
        sortDirection: table_state.sort_direction,
        filters: table_state.status ? { status: table_state.status } : {},
    } satisfies DataTableQuery;
    const form = useForm({
        status: 'disetujui',
        catatan_penolakan: '',
        nomor_surat_resmi: '',
    });

    function openReview(row: Row) {
        form.reset();
        form.clearErrors();
        form.setData({
            status: 'disetujui',
            catatan_penolakan: row.catatan_penolakan ?? '',
            nomor_surat_resmi: row.nomor_surat_resmi ?? '',
        });
        setSelected(row);
    }

    function closeReview() {
        setSelected(null);
        form.reset();
        form.clearErrors();
    }

    function changeTable(query: DataTableQuery) {
        const parameters: Record<string, string | number> = {
            page: query.page,
            per_page: query.perPage,
            sort_direction: query.sortDirection,
        };
        if (query.search) {
            parameters.search = query.search;
        }
        if (query.sortBy) {
            parameters.sort_by = query.sortBy;
        }
        if (query.filters.status) {
            parameters.status = query.filters.status;
        }

        const routeOptions = { query: parameters };
        const url =
            role === 'admin_layanan'
                ? adminLayananPage.url(routeOptions)
                : adminPage.url(routeOptions);

        setRequestError(null);
        router.get(
            url,
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setTableLoading(true),
                onSuccess: () => setRequestError(null),
                onError: (errors) => {
                    const firstError = Object.values(errors)[0];
                    setRequestError(
                        Array.isArray(firstError)
                            ? firstError[0]
                            : (firstError ?? 'Data pengajuan gagal dimuat.'),
                    );
                },
                onFinish: () => setTableLoading(false),
            },
        );
    }

    const columns: DataColumn<Row>[] = [
        {
            key: 'nomor_pengajuan',
            label: 'No. Pengajuan',
            value: (row) => row.nomor_pengajuan,
            render: (row) => (
                <span className="font-medium">{row.nomor_pengajuan}</span>
            ),
        },
        {
            key: 'mahasiswa',
            label: 'Mahasiswa',
            sortable: false,
            value: (row) =>
                `${row.mahasiswa?.user?.nama ?? ''} ${row.mahasiswa?.user?.nim_nip ?? ''}`,
            render: (row) => (
                <div>
                    <div className="font-medium">
                        {row.mahasiswa?.user?.nama ?? 'Mahasiswa'}
                    </div>
                    <div className="text-muted text-xs">
                        {row.mahasiswa?.user?.nim_nip ?? 'NIM tidak tersedia'}
                    </div>
                </div>
            ),
        },
        {
            key: 'legacy_verification_path',
            label: 'Jenis verifikasi',
            sortable: false,
            value: (row) => verificationLabel(row.legacy_verification_path),
            render: (row) => verificationLabel(row.legacy_verification_path),
        },
        {
            key: 'created_at',
            label: 'Tanggal masuk',
            value: (row) => row.created_at ?? '',
            render: (row) => formatDate(row.created_at),
        },
        {
            key: 'status',
            label: 'Status',
            filter: {
                type: 'select',
                options: [
                    { value: 'diajukan', label: 'Diajukan' },
                    { value: 'diverifikasi', label: 'Diverifikasi' },
                    { value: 'disetujui', label: 'Disetujui' },
                    { value: 'ditolak', label: 'Ditolak' },
                ],
            },
            render: (row) => <StatusBadge status={row.status} />,
        },
        {
            key: 'aksi',
            label: 'Aksi',
            action: true,
            render: (row) => (
                <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => openReview(row)}
                >
                    {row.status === 'disetujui' ? 'Lihat detail' : 'Verifikasi'}
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <PageHeader
                title="Verifikasi Surat Asrama"
                subtitle="Kelola pengajuan dan periksa dokumen sebelum memberikan keputusan. Lengkapi arsip alumni dan tarif gedung/angkatan di Pengaturan Layanan."
            />

            <Card className="p-4">
                <DataTable<Row>
                    columns={columns}
                    data={rows}
                    searchKeys={['nomor_pengajuan', 'mahasiswa.user.nim_nip']}
                    searchPlaceholder="Cari nomor pengajuan, nama, atau NIM"
                    defaultPerPage={10}
                    emptyMessage="Belum ada pengajuan bebas asrama."
                    server={{
                        ...tableQuery,
                        total: bebas_asrama?.total ?? 0,
                        lastPage: bebas_asrama?.last_page ?? 1,
                        loading: tableLoading,
                        error: requestError ?? table_state.error ?? null,
                        onChange: changeTable,
                    }}
                />
            </Card>

            <Modal
                open={selected !== null}
                onClose={closeReview}
                title={
                    selected?.status === 'disetujui'
                        ? 'Detail pengajuan bebas asrama'
                        : 'Verifikasi pengajuan bebas asrama'
                }
                width="max-w-2xl"
            >
                {selected && (
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-muted text-sm">
                                    {selected.nomor_pengajuan}
                                </p>
                                <h3 className="font-semibold">
                                    {selected.mahasiswa?.user?.nama ??
                                        'Mahasiswa'}
                                </h3>
                                <p className="text-muted text-sm">
                                    {selected.mahasiswa?.user?.nim_nip ??
                                        'NIM tidak tersedia'}
                                </p>
                            </div>
                            <StatusBadge status={selected.status} />
                        </div>

                        <div className="bg-base-200/60 rounded-lg p-4">
                            <p className="text-muted text-xs font-medium tracking-wide uppercase">
                                Jenis verifikasi
                            </p>
                            <p className="mt-1 text-sm">
                                {verificationLabel(
                                    selected.legacy_verification_path,
                                )}
                            </p>
                            {selected.catatan_penolakan && (
                                <p className="mt-3 text-sm">
                                    <span className="font-medium">
                                        Catatan sebelumnya:{' '}
                                    </span>
                                    {selected.catatan_penolakan}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold">
                                Dokumen pendukung
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {selected.payment_evidence_path && (
                                    <a
                                        className="btn btn-outline btn-sm"
                                        href={evidence.url({
                                            pengajuan: selected.id,
                                            kind: 'payment',
                                        })}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Lihat bukti bayar
                                    </a>
                                )}
                                {selected.bank_statement_path && (
                                    <a
                                        className="btn btn-outline btn-sm"
                                        href={evidence.url({
                                            pengajuan: selected.id,
                                            kind: 'bank-statement',
                                        })}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Lihat rekening koran
                                    </a>
                                )}
                                {selected.file_surat_path && (
                                    <a
                                        className="btn btn-outline btn-sm"
                                        href={surat.url({
                                            pengajuan: selected.id,
                                        })}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Unduh surat
                                    </a>
                                )}
                                {!selected.payment_evidence_path &&
                                    !selected.bank_statement_path &&
                                    !selected.file_surat_path && (
                                        <p className="text-muted text-sm">
                                            Tidak ada dokumen pendukung pada
                                            pengajuan ini.
                                        </p>
                                    )}
                            </div>
                        </div>

                        {selected.status === 'disetujui' ? (
                            selected.nomor_surat_resmi && (
                                <p className="text-sm">
                                    <span className="font-medium">
                                        Nomor surat resmi:{' '}
                                    </span>
                                    {selected.nomor_surat_resmi}
                                </p>
                            )
                        ) : (
                            <form
                                className="border-base-200 space-y-4 border-t pt-4"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    form.post(
                                        approve.url({
                                            pengajuan: selected.id,
                                        }),
                                        {
                                            preserveScroll: true,
                                            onSuccess: closeReview,
                                        },
                                    );
                                }}
                            >
                                <label className="block space-y-1 text-sm">
                                    <span>Keputusan</span>
                                    <select
                                        className={inputClass}
                                        value={form.data.status}
                                        onChange={(event) =>
                                            form.setData(
                                                'status',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="disetujui">
                                            Verifikasi dan setujui
                                        </option>
                                        <option value="ditolak">
                                            Tolak pengajuan
                                        </option>
                                    </select>
                                    {form.errors.status && (
                                        <span
                                            role="alert"
                                            className="text-error text-xs"
                                        >
                                            {form.errors.status}
                                        </span>
                                    )}
                                </label>
                                <label className="block space-y-1 text-sm">
                                    <span>Nomor surat resmi (opsional)</span>
                                    <input
                                        className={inputClass}
                                        value={form.data.nomor_surat_resmi}
                                        onChange={(event) =>
                                            form.setData(
                                                'nomor_surat_resmi',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    {form.errors.nomor_surat_resmi && (
                                        <span
                                            role="alert"
                                            className="text-error text-xs"
                                        >
                                            {form.errors.nomor_surat_resmi}
                                        </span>
                                    )}
                                </label>
                                <label className="block space-y-1 text-sm">
                                    <span>Catatan penolakan (opsional)</span>
                                    <textarea
                                        className={inputClass}
                                        rows={3}
                                        value={form.data.catatan_penolakan}
                                        onChange={(event) =>
                                            form.setData(
                                                'catatan_penolakan',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    {form.errors.catatan_penolakan && (
                                        <span
                                            role="alert"
                                            className="text-error text-xs"
                                        >
                                            {form.errors.catatan_penolakan}
                                        </span>
                                    )}
                                </label>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={closeReview}
                                        disabled={form.processing}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        disabled={form.processing}
                                    >
                                        {form.processing
                                            ? 'Menyimpan...'
                                            : 'Simpan keputusan'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
