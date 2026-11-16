import { Link, router, useForm, usePoll } from '@inertiajs/react';
import { Download, Eye, Landmark } from 'lucide-react';
import { useState } from 'react';
import {
    ConfirmDialog,
    DataTable,
    inputClass,
    PageHeader,
    StatusBadge,
    type DataColumn,
    type DataTableQuery,
} from '../../components/ui';
import { Modal } from '../../components/atoms/Modal';
import { verify, bukti } from '@/routes/andalas/pembayaran';
import { show as showWorkflowRegistration } from '@/routes/residence/registrations';
import { workflow as workflowPage } from '@/routes/residence';
import { evidence as paymentEvidence } from '@/routes/residence/payments';
import { verifikasiPembayaran as adminPage } from '@/routes/admin';
import { verifikasiPembayaran as adminLayananPage } from '@/routes/admin_layanan';
import { formatDateTime, formatRupiah } from '../../lib/format';

type BankStatement = {
    id: string;
    reference: string;
    source: string;
    evidence_path: string;
    paid_at?: string | null;
    created_at?: string | null;
};

function statementFileKind(path?: string): 'image' | 'pdf' | 'other' {
    const ext = (path?.split('.').pop() ?? '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
        return 'image';
    }
    if (ext === 'pdf') {
        return 'pdf';
    }
    return 'other';
}

type Payment = {
    id: string;
    kode_transaksi?: string;
    nominal: number;
    status: string;
    rekening_tujuan?: string | null;
    nama_bank?: string | null;
    nomor_rekening_pengirim?: string | null;
    atas_nama_pengirim?: string | null;
    tanggal_bayar?: string | null;
    catatan_verifikasi?: string;
    bukti_transfer_path?: string;
    mahasiswa?: { user?: { nama: string; nim_nip: string } };
    tagihan?: {
        nomor: string;
        registration?: { id: string; workflow_version?: number | null } | null;
    };
};
type PaginatedPayments = {
    data: Payment[];
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

export default function VerifikasiPembayaran({
    pembayaran,
    table_state = {
        search: '',
        status: '',
        sort_by: 'created_at',
        sort_direction: 'desc',
    },
    bank_statements = [],
    role = 'staff_admin',
}: {
    pembayaran?: PaginatedPayments;
    table_state?: TableState;
    bank_statements?: BankStatement[];
    role?: string;
}) {
    usePoll(5000, { only: ['pembayaran', 'table_state'] });
    const [selected, setSelected] = useState<Payment | null>(null);
    const [previewStatement, setPreviewStatement] =
        useState<BankStatement | null>(null);
    const [confirmVerify, setConfirmVerify] = useState(false);
    const [loading, setLoading] = useState(false);
    const [requestError, setRequestError] = useState<string | null>(null);
    const rows = pembayaran?.data ?? [];
    const form = useForm({ status: 'lunas', catatan_verifikasi: '' });
    const tableQuery = {
        search: table_state.search,
        page: pembayaran?.current_page ?? 1,
        perPage: pembayaran?.per_page ?? 10,
        sortBy: table_state.sort_by,
        sortDirection: table_state.sort_direction,
        filters: { status: table_state.status ?? '' },
    } satisfies DataTableQuery;

    function openReview(payment: Payment) {
        form.reset();
        form.clearErrors();
        form.setData({ status: 'lunas', catatan_verifikasi: '' });
        setConfirmVerify(false);
        setSelected(payment);
    }

    function closeReview() {
        setConfirmVerify(false);
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
        if (query.search) parameters.search = query.search;
        if (query.sortBy) parameters.sort_by = query.sortBy;
        if (query.filters.status) parameters.status = query.filters.status;
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
                onStart: () => setLoading(true),
                onError: (errors) =>
                    setRequestError(
                        Object.values(errors)[0] ??
                            'Data pembayaran gagal dimuat.',
                    ),
                onFinish: () => setLoading(false),
            },
        );
    }

    const columns: DataColumn<Payment>[] = [
        {
            key: 'kode_transaksi',
            label: 'Transaksi / Tagihan',
            value: (row) =>
                `${row.kode_transaksi ?? ''} ${row.tagihan?.nomor ?? ''}`,
            render: (row) => (
                <div>
                    <p className="font-medium">
                        {row.kode_transaksi ?? 'Transaksi'}
                    </p>
                    <p className="text-muted text-xs">
                        {row.tagihan?.nomor ?? 'Tanpa nomor tagihan'}
                    </p>
                </div>
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
                    <p className="font-medium">
                        {row.mahasiswa?.user?.nama ?? 'Mahasiswa'}
                    </p>
                    <p className="text-muted text-xs">
                        {row.mahasiswa?.user?.nim_nip ?? '-'}
                    </p>
                </div>
            ),
        },
        {
            key: 'nominal',
            label: 'Nominal',
            render: (row) => formatRupiah(row.nominal),
        },
        {
            key: 'status',
            label: 'Status',
            filter: {
                type: 'select',
                options: [
                    {
                        value: 'menunggu_verifikasi',
                        label: 'Menunggu verifikasi',
                    },
                    { value: 'lunas', label: 'Lunas' },
                    { value: 'ditolak', label: 'Ditolak' },
                    { value: 'kadaluarsa', label: 'Kedaluwarsa' },
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
                    {row.status === 'menunggu_verifikasi'
                        ? 'Verifikasi'
                        : 'Lihat detail'}
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <PageHeader
                title="Verifikasi Pembayaran"
                subtitle="Pembayaran valid memperbarui tagihan dan menyelesaikan pendaftaran atau penerbitan surat yang memenuhi syarat."
            />
            {(requestError || table_state.error) && (
                <p className="alert alert-error text-sm" role="alert">
                    {requestError ?? table_state.error}
                </p>
            )}
            <details className="bg-base-100 border-base-300 rounded-xl border p-3.5 text-sm shadow-xs">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 font-medium">
                    <span className="flex items-center gap-2">
                        <Landmark className="text-primary size-4" />
                        Arsip Rekening Koran DPUB untuk Pencocokan Manual (
                        {bank_statements.length})
                    </span>
                    <Link
                        href={workflowPage.url({ query: { section: 'finance' } })}
                        className="link link-primary text-xs font-normal"
                    >
                        Kelola / Upload Rekening Koran →
                    </Link>
                </summary>
                {bank_statements.length === 0 ? (
                    <p className="text-base-content/70 mt-2.5 text-xs">
                        Belum ada file rekening koran DPUB yang diunggah. Anda
                        tetap dapat memverifikasi bukti pembayaran langsung
                        setelah memeriksa mutasi bank.
                    </p>
                ) : (
                    <div className="mt-3 overflow-x-auto">
                        <table className="table-xs table">
                            <thead>
                                <tr>
                                    <th>Referensi / Judul</th>
                                    <th>Bank / Sumber</th>
                                    <th>Tanggal</th>
                                    <th className="text-right">Berkas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bank_statements.map((stmt) => (
                                    <tr key={stmt.id}>
                                        <td className="font-medium">
                                            {stmt.reference}
                                        </td>
                                        <td>{stmt.source}</td>
                                        <td>
                                            {stmt.paid_at?.slice(0, 10) ?? '-'}
                                        </td>
                                        <td className="flex justify-end gap-1.5">
                                            {statementFileKind(
                                                stmt.evidence_path,
                                            ) !== 'other' && (
                                                <button
                                                    type="button"
                                                    className="btn btn-xs btn-outline btn-primary gap-1"
                                                    onClick={() =>
                                                        setPreviewStatement(
                                                            stmt,
                                                        )
                                                    }
                                                >
                                                    <Eye className="size-3" />
                                                    Preview
                                                </button>
                                            )}
                                            <a
                                                href={paymentEvidence.url(
                                                    stmt.id,
                                                )}
                                                className="btn btn-xs btn-outline gap-1"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <Download className="size-3" />
                                                Unduh
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </details>
            <DataTable
                columns={columns}
                data={rows}
                searchKeys={['kode_transaksi', 'mahasiswa']}
                searchPlaceholder="Cari transaksi, tagihan, mahasiswa, atau NIM"
                emptyMessage="Belum ada pembayaran."
                server={{
                    ...tableQuery,
                    total: pembayaran?.total ?? 0,
                    lastPage: pembayaran?.last_page ?? 1,
                    loading,
                    error: requestError,
                    onChange: changeTable,
                }}
            />

            <Modal
                open={!!selected}
                onClose={closeReview}
                title="Detail dan verifikasi pembayaran"
                width="max-w-xl"
            >
                {selected && (
                    <div className="space-y-5">
                        <div className="border-base-200 space-y-2 border-b pb-4 text-sm">
                            <p>
                                <span className="font-medium">Mahasiswa:</span>{' '}
                                {selected.mahasiswa?.user?.nama ?? 'Mahasiswa'}{' '}
                                / {selected.mahasiswa?.user?.nim_nip ?? '-'}
                            </p>
                            <p>
                                <span className="font-medium">Transaksi:</span>{' '}
                                {selected.kode_transaksi ?? '-'} /{' '}
                                {selected.tagihan?.nomor ?? '-'}
                            </p>
                            <p>
                                <span className="font-medium">Nominal:</span>{' '}
                                {formatRupiah(selected.nominal)}
                            </p>
                            {selected.rekening_tujuan && (
                                <p>
                                    <span className="font-medium">
                                        Rekening Tujuan:
                                    </span>{' '}
                                    {selected.rekening_tujuan}
                                </p>
                            )}
                            {(selected.nama_bank ||
                                selected.nomor_rekening_pengirim ||
                                selected.atas_nama_pengirim) && (
                                <p>
                                    <span className="font-medium">
                                        Rekening Pengirim:
                                    </span>{' '}
                                    {selected.nama_bank || '-'}{' '}
                                    {selected.nomor_rekening_pengirim
                                        ? `· ${selected.nomor_rekening_pengirim}`
                                        : ''}
                                    {selected.atas_nama_pengirim
                                        ? ` a.n. ${selected.atas_nama_pengirim}`
                                        : ''}
                                </p>
                            )}
                            {selected.tanggal_bayar && (
                                <p>
                                    <span className="font-medium">
                                        Waktu Transfer:
                                    </span>{' '}
                                    {formatDateTime(selected.tanggal_bayar)}
                                </p>
                            )}
                            <p>
                                <span className="font-medium">Status:</span>{' '}
                                <StatusBadge status={selected.status} />
                            </p>
                            {selected.catatan_verifikasi && (
                                <p>
                                    <span className="font-medium">
                                        Catatan verifikasi:
                                    </span>{' '}
                                    {selected.catatan_verifikasi}
                                </p>
                            )}
                            {selected.bukti_transfer_path && (
                                <a
                                    className="link link-primary"
                                    href={bukti.url({
                                        pembayaran: selected.id,
                                    })}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Lihat bukti pembayaran
                                </a>
                            )}
                        </div>
                        {selected.status === 'menunggu_verifikasi' && (
                            <form
                                className="space-y-4"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    setConfirmVerify(true);
                                }}
                            >
                                {selected.tagihan?.registration
                                    ?.workflow_version === 2 && (
                                    <div className="border-base-300 bg-base-200/40 rounded-lg border p-3 text-xs">
                                        <p className="text-base-content/80">
                                            Pastikan dana transfer telah cocok
                                            dengan mutasi / rekening koran DPUB
                                            sebelum mengesahkan{' '}
                                            <strong>Pembayaran valid</strong>{' '}
                                            (status mahasiswa akan otomatis aktif).
                                            Buka{' '}
                                            <Link
                                                href={showWorkflowRegistration.url(
                                                    selected.tagihan
                                                        .registration.id,
                                                )}
                                                className="link link-primary font-medium"
                                            >
                                                detail pendaftaran
                                            </Link>{' '}
                                            atau cek arsip rekening koran DPUB di
                                            atas bila diperlukan.
                                        </p>
                                    </div>
                                )}
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
                                        <option value="lunas">
                                            Pembayaran valid
                                        </option>
                                        <option value="ditolak">
                                            Tolak bukti
                                        </option>
                                    </select>
                                    {form.errors.status && (
                                        <span className="text-error text-xs">
                                            {form.errors.status}
                                        </span>
                                    )}
                                </label>
                                <label className="block space-y-1 text-sm">
                                    <span>
                                        {form.data.status === 'ditolak'
                                            ? 'Catatan penolakan'
                                            : 'Catatan (opsional)'}
                                    </span>
                                    <textarea
                                        className={inputClass}
                                        rows={3}
                                        required={form.data.status === 'ditolak'}
                                        value={form.data.catatan_verifikasi}
                                        onChange={(event) =>
                                            form.setData(
                                                'catatan_verifikasi',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    {form.errors.catatan_verifikasi && (
                                        <span className="text-error text-xs">
                                            {form.errors.catatan_verifikasi}
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
                                            : 'Simpan verifikasi'}
                                    </button>
                                </div>
                                {confirmVerify && (
                                    <ConfirmDialog
                                        open
                                        onClose={() => setConfirmVerify(false)}
                                        loading={form.processing}
                                        title={
                                            form.data.status === 'ditolak'
                                                ? 'Tolak Bukti Pembayaran?'
                                                : 'Sahkan Pembayaran?'
                                        }
                                        message={
                                            form.data.status === 'ditolak'
                                                ? `Tolak bukti pembayaran ${formatRupiah(Number(selected.nominal ?? 0))} milik ${selected.mahasiswa?.user?.nama ?? 'penghuni'}?`
                                                : `Konfirmasi pembayaran sebesar ${formatRupiah(Number(selected.nominal ?? 0))} untuk ${selected.mahasiswa?.user?.nama ?? 'penghuni'} telah masuk ke rekening?`
                                        }
                                        confirmLabel={
                                            form.data.status === 'ditolak'
                                                ? 'Ya, tolak bukti'
                                                : 'Ya, sahkan pembayaran'
                                        }
                                        onConfirm={() =>
                                            form.post(
                                                verify.url({
                                                    pembayaran: selected.id,
                                                }),
                                                {
                                                    preserveScroll: true,
                                                    onSuccess: closeReview,
                                                    onFinish: () =>
                                                        setConfirmVerify(false),
                                                },
                                            )
                                        }
                                    />
                                )}
                            </form>
                        )}
                    </div>
                )}
            </Modal>

            <Modal
                open={Boolean(previewStatement)}
                onClose={() => setPreviewStatement(null)}
                title={
                    previewStatement
                        ? `Preview Rekening Koran: ${previewStatement.reference}`
                        : 'Preview Rekening Koran DPUB'
                }
                width="max-w-4xl"
            >
                {previewStatement && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="text-base-content/75">
                                {previewStatement.source} ·{' '}
                                {previewStatement.paid_at?.slice(0, 10) ?? '-'}
                            </span>
                            <a
                                href={paymentEvidence.url(previewStatement.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline btn-xs gap-1"
                            >
                                <Download className="size-3.5" />
                                Unduh File Asli
                            </a>
                        </div>
                        {statementFileKind(previewStatement.evidence_path) ===
                        'image' ? (
                            <div className="border-base-300 bg-base-200/40 flex max-h-[70vh] justify-center overflow-auto rounded-lg border p-2">
                                <img
                                    src={paymentEvidence.url(
                                        previewStatement.id,
                                        { query: { inline: 1 } },
                                    )}
                                    alt={previewStatement.reference}
                                    className="max-h-[66vh] w-auto rounded object-contain"
                                />
                            </div>
                        ) : (
                            <iframe
                                src={paymentEvidence.url(previewStatement.id, {
                                    query: { inline: 1 },
                                })}
                                title={previewStatement.reference}
                                className="border-base-300 h-[70vh] w-full rounded-lg border"
                            />
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
