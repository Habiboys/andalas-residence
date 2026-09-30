import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    Button,
    DataTable,
    Drawer,
    inputClass,
    PageHeader,
    StatusBadge,
    type DataColumn,
    type DataTableQuery,
} from '../../components/ui';
import { sponsor, update } from '@/routes/andalas/registrations';
import { registrationReview as adminPage } from '@/routes/admin';
import { registrationReview as adminLayananPage } from '@/routes/admin_layanan';

type Room = {
    id: string;
    nomor_kamar: string;
    lantai?: { gedung?: { nama_gedung: string } };
};
type Row = {
    id: string;
    funding?: string;
    is_kipk: boolean;
    reserved_room_id?: string;
    sponsor_name?: string;
    status: string;
    completed_at?: string;
    student_profile?: { user?: { nama: string; nim_nip: string } };
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

export default function RegistrationReview({
    registrations,
    rooms = [],
    table_state = {
        search: '',
        status: '',
        sort_by: 'created_at',
        sort_direction: 'desc',
    },
    role = 'staff_admin',
}: {
    registrations?: PaginatedRows;
    rooms?: Room[];
    table_state?: TableState;
    role?: string;
}) {
    const [selected, setSelected] = useState<Row | null>(null);
    const [loading, setLoading] = useState(false);
    const [requestError, setRequestError] = useState<string | null>(null);
    const rows = registrations?.data ?? [];
    const form = useForm({
        kamar_id: '',
        sponsor_name: '',
        notes: '',
    });
    const tableQuery = {
        search: table_state.search,
        page: registrations?.current_page ?? 1,
        perPage: registrations?.per_page ?? 10,
        sortBy: table_state.sort_by,
        sortDirection: table_state.sort_direction,
        filters: { status: table_state.status ?? '' },
    } satisfies DataTableQuery;

    function openReview(row: Row) {
        form.reset();
        form.clearErrors();
        form.setData({
            kamar_id: row.reserved_room_id ?? '',
            sponsor_name: row.sponsor_name ?? '',
            notes: '',
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
                            'Data pendaftaran gagal dimuat.',
                    ),
                onFinish: () => setLoading(false),
            },
        );
    }

    const columns: DataColumn<Row>[] = [
        {
            key: 'student',
            label: 'Mahasiswa',
            sortable: false,
            value: (row) =>
                `${row.student_profile?.user?.nama ?? ''} ${row.student_profile?.user?.nim_nip ?? ''}`,
            render: (row) => (
                <div>
                    <p className="font-medium">
                        {row.student_profile?.user?.nama ?? 'Mahasiswa'}
                    </p>
                    <p className="text-muted text-xs">
                        {row.student_profile?.user?.nim_nip ??
                            'NIM tidak tersedia'}
                    </p>
                </div>
            ),
        },
        {
            key: 'funding',
            label: 'Skema',
            sortable: false,
            render: (row) =>
                row.funding === 'sponsor'
                    ? 'Sponsor'
                    : row.is_kipk
                      ? 'KIP-K'
                      : 'Mandiri',
        },
        {
            key: 'status',
            label: 'Status',
            filter: {
                type: 'select',
                options: [
                    { value: 'draft', label: 'Draft' },
                    { value: 'submitted', label: 'Diajukan' },
                    { value: 'verified', label: 'Terverifikasi' },
                    { value: 'accepted', label: 'Diterima' },
                    { value: 'rejected', label: 'Ditolak' },
                    { value: 'cancelled', label: 'Dibatalkan' },
                ],
            },
            render: (row) => (
                <StatusBadge status={row.completed_at ? 'aktif' : row.status} />
            ),
        },
        {
            key: 'aksi',
            label: 'Aksi',
            action: true,
            render: (row) => (
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openReview(row)}
                >
                    {row.completed_at || row.status === 'rejected'
                        ? 'Lihat detail'
                        : 'Kelola'}
                </Button>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <PageHeader
                title="Penempatan dan Penanggung Biaya"
                subtitle="Pendaftaran pribadi selesai otomatis setelah pembayaran; KIP-K dan sponsor dikelola di sini."
            />
            {(requestError || table_state.error) && (
                <p className="alert alert-error text-sm" role="alert">
                    {requestError ?? table_state.error}
                </p>
            )}
            <DataTable
                columns={columns}
                data={rows}
                searchKeys={['student']}
                searchPlaceholder="Cari nama atau NIM mahasiswa"
                emptyMessage="Belum ada pendaftaran."
                server={{
                    ...tableQuery,
                    total: registrations?.total ?? 0,
                    lastPage: registrations?.last_page ?? 1,
                    loading,
                    error: requestError,
                    onChange: changeTable,
                }}
            />

            <Drawer
                open={!!selected}
                onClose={closeReview}
                title={`Kelola pendaftaran ${selected?.student_profile?.user?.nama ?? ''}`}
                width="w-full max-w-xl"
            >
                {selected && (
                    <div className="space-y-5">
                        <div className="border-base-200 space-y-1 border-b pb-4 text-sm">
                            <p>
                                <span className="font-medium">NIM:</span>{' '}
                                {selected.student_profile?.user?.nim_nip ?? '-'}
                            </p>
                            <p>
                                <span className="font-medium">Status:</span>{' '}
                                {selected.completed_at
                                    ? 'Aktif'
                                    : selected.status}
                            </p>
                            <p>
                                {selected.funding === 'sponsor'
                                    ? 'Verifikasi penanggung biaya dan tempatkan penghuni.'
                                    : 'Pembayaran pribadi menyelesaikan pendaftaran secara otomatis.'}
                            </p>
                        </div>
                        {!selected.completed_at &&
                            selected.status !== 'rejected' && (
                                <>
                                    {selected.funding === 'sponsor' && (
                                        <form
                                            className="space-y-4"
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                form.post(
                                                    sponsor.url({
                                                        registration:
                                                            selected.id,
                                                    }),
                                                    {
                                                        preserveScroll: true,
                                                        onSuccess: closeReview,
                                                    },
                                                );
                                            }}
                                        >
                                            {selected.is_kipk && (
                                                <label className="block space-y-1 text-sm">
                                                    <span>Kamar KIP-K</span>
                                                    <select
                                                        className={inputClass}
                                                        required
                                                        value={
                                                            form.data.kamar_id
                                                        }
                                                        onChange={(event) =>
                                                            form.setData(
                                                                'kamar_id',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    >
                                                        <option value="">
                                                            Pilih kamar
                                                        </option>
                                                        {rooms.map((room) => (
                                                            <option
                                                                key={room.id}
                                                                value={room.id}
                                                            >
                                                                {
                                                                    room.lantai
                                                                        ?.gedung
                                                                        ?.nama_gedung
                                                                }{' '}
                                                                /{' '}
                                                                {
                                                                    room.nomor_kamar
                                                                }
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {form.errors.kamar_id && (
                                                        <span className="text-error text-xs">
                                                            {
                                                                form.errors
                                                                    .kamar_id
                                                            }
                                                        </span>
                                                    )}
                                                </label>
                                            )}
                                            <label className="block space-y-1 text-sm">
                                                <span>Penanggung biaya</span>
                                                <input
                                                    className={inputClass}
                                                    required
                                                    value={
                                                        form.data.sponsor_name
                                                    }
                                                    onChange={(event) =>
                                                        form.setData(
                                                            'sponsor_name',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                                {form.errors.sponsor_name && (
                                                    <span className="text-error text-xs">
                                                        {
                                                            form.errors
                                                                .sponsor_name
                                                        }
                                                    </span>
                                                )}
                                            </label>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={closeReview}
                                                    disabled={form.processing}
                                                >
                                                    Batal
                                                </Button>
                                                <Button
                                                    disabled={form.processing}
                                                >
                                                    {form.processing
                                                        ? 'Menyimpan...'
                                                        : 'Sahkan pendaftaran'}
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                                    {selected.funding !== 'sponsor' && (
                                        <p className="text-muted text-sm">
                                            Tidak ada tindakan penempatan manual
                                            untuk pendaftaran ini.
                                        </p>
                                    )}
                                    <form
                                        className="border-base-200 space-y-3 border-t pt-4"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            form.patch(
                                                update.url({
                                                    registration: selected.id,
                                                }),
                                                {
                                                    preserveScroll: true,
                                                    onSuccess: closeReview,
                                                },
                                            );
                                        }}
                                    >
                                        <label className="block space-y-1 text-sm">
                                            <span>Catatan pembatalan</span>
                                            <textarea
                                                className={inputClass}
                                                rows={3}
                                                value={form.data.notes}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'notes',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </label>
                                        {form.errors.notes && (
                                            <p
                                                className="text-error text-xs"
                                                role="alert"
                                            >
                                                {form.errors.notes}
                                            </p>
                                        )}
                                        <div className="flex justify-end">
                                            <Button
                                                variant="secondary"
                                                disabled={form.processing}
                                            >
                                                Batalkan pendaftaran
                                            </Button>
                                        </div>
                                    </form>
                                </>
                            )}
                    </div>
                )}
            </Drawer>
        </div>
    );
}
