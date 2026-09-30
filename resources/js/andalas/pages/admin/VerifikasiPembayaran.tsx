import { router, useForm, usePoll } from '@inertiajs/react';
import { useState } from 'react';
import {
    DataTable,
    inputClass,
    PageHeader,
    StatusBadge,
    type DataColumn,
    type DataTableQuery,
} from '../../components/ui';
import { Modal } from '../../components/atoms/Modal';
import { verify, bukti } from '@/routes/andalas/pembayaran';
import { verifikasiPembayaran as adminPage } from '@/routes/admin';
import { verifikasiPembayaran as adminLayananPage } from '@/routes/admin_layanan';
import { formatRupiah } from '../../lib/format';

type Payment = {
    id: string;
    kode_transaksi?: string;
    nominal: number;
    status: string;
    catatan_verifikasi?: string;
    bukti_transfer_path?: string;
    mahasiswa?: { user?: { nama: string; nim_nip: string } };
    tagihan?: { nomor: string };
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
    role = 'staff_admin',
}: {
    pembayaran?: PaginatedPayments;
    table_state?: TableState;
    role?: string;
}) {
    usePoll(5000, { only: ['pembayaran', 'table_state'] });
    const [selected, setSelected] = useState<Payment | null>(null);
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
        filters: table_state.status ? { status: table_state.status } : {},
    } satisfies DataTableQuery;

    function openReview(payment: Payment) {
        form.reset();
        form.clearErrors();
        form.setData({ status: 'lunas', catatan_verifikasi: '' });
        setSelected(payment);
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
                                    form.post(
                                        verify.url({ pembayaran: selected.id }),
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
                                    <span>Catatan</span>
                                    <textarea
                                        className={inputClass}
                                        rows={3}
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
                            </form>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
