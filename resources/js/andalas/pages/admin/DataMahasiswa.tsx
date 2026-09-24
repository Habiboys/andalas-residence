import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    DataTable,
    Button,
    Drawer,
    FormField,
    inputClass,
    ConfirmDialog,
    RowActions,
    type DataColumn,
} from '../../components/ui';
import {
    store as mahasiswaStore,
    update as mahasiswaUpdate,
    destroy as mahasiswaDestroy,
} from '@/routes/andalas/mahasiswa';

type MhsRow = {
    id: string;
    angkatan?: string;
    status_huni?: string;
    user?: {
        nim_nip?: string;
        nama?: string;
        email?: string;
        gender?: string;
        client_profile_category?: string;
    };
    prodi?: { id?: string; name?: string };
    periode?: { id?: string; nama_periode?: string };
};

type ProdiRow = { id: string; name?: string };
type PeriodeRow = { id: string; nama_periode?: string };

type Props = { mahasiswa: MhsRow[]; prodi: ProdiRow[]; periode: PeriodeRow[] };

const emptyForm = {
    nim_nip: '',
    nama: '',
    email: '',
    password: '',
    no_hp: '',
    prodi_id: '',
    angkatan: '',
    client_profile_category: 'local_non_kipk',
    gender: 'laki_laki',
};

export default function DataMahasiswa({ mahasiswa, prodi }: Props) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<MhsRow | null>(null);
    const [deleting, setDeleting] = useState<MhsRow | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);
    const {
        data,
        setData,
        post,
        put,
        errors,
        processing,
        resetAndClearErrors,
        clearErrors,
    } = useForm(emptyForm);

    function openCreate() {
        setEditing(null);
        resetAndClearErrors();
        setOpen(true);
    }

    function openEdit(row: MhsRow) {
        setEditing(row);
        setData({
            nim_nip: row.user?.nim_nip ?? '',
            nama: row.user?.nama ?? '',
            email: row.user?.email ?? '',
            password: '',
            no_hp: '',
            prodi_id: row.prodi?.id ?? '',
            angkatan: row.angkatan ?? '',
            client_profile_category:
                row.user?.client_profile_category ?? 'local_non_kipk',
            gender: row.user?.gender ?? 'laki_laki',
        });
        clearErrors();
        setOpen(true);
    }

    function save(e: React.FormEvent) {
        e.preventDefault();
        if (editing) {
            put(mahasiswaUpdate.url({ id: editing.id }), {
                onSuccess: () => setOpen(false),
            });
        } else {
            post(mahasiswaStore.url(), { onSuccess: () => setOpen(false) });
        }
    }

    function confirmDelete() {
        if (!deleting) return;
        setDeletingBusy(true);
        router.delete(mahasiswaDestroy.url({ id: deleting.id }), {
            onSuccess: () => setDeleting(null),
            onFinish: () => setDeletingBusy(false),
        });
    }

    const columns: DataColumn<MhsRow>[] = [
        {
            key: 'nim',
            label: 'NIM',
            render: (r: MhsRow) => r.user?.nim_nip ?? '-',
        },
        {
            key: 'nama',
            label: 'Nama',
            render: (r: MhsRow) => r.user?.nama ?? '-',
        },
        {
            key: 'prodi',
            label: 'Prodi',
            value: (r) => r.prodi?.name ?? '',
            filter: {
                type: 'select',
                options: prodi
                    .filter((item) => item.name)
                    .map((item) => item.name!),
            },
            render: (r: MhsRow) => r.prodi?.name ?? '-',
        },
        {
            key: 'angkatan',
            label: 'Angkatan',
            filter: {
                type: 'select',
                options: [
                    ...new Set(
                        mahasiswa
                            .map((item) => String(item.angkatan ?? ''))
                            .filter(Boolean),
                    ),
                ]
                    .sort()
                    .reverse(),
            },
        },
        {
            key: 'status_huni',
            label: 'Status Huni',
            filter: {
                type: 'select',
                options: [
                    ...new Set(
                        mahasiswa
                            .map((item) => item.status_huni)
                            .filter((status): status is string =>
                                Boolean(status),
                            ),
                    ),
                ].map((status) => ({
                    value: status,
                    label: status.replaceAll('_', ' '),
                })),
            },
        },
        {
            key: 'email',
            label: 'Email',
            render: (r: MhsRow) => r.user?.email ?? '-',
        },
        {
            key: 'aksi',
            label: 'Aksi',
            render: (r: MhsRow) => (
                <RowActions
                    onEdit={() => openEdit(r)}
                    onDelete={() => setDeleting(r)}
                />
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Data Mahasiswa"
                subtitle="Kelola data mahasiswa penghuni asrama"
                actions={<Button onClick={openCreate}>Tambah Mahasiswa</Button>}
            />
            <Card className="p-4">
                <DataTable
                    columns={columns}
                    data={mahasiswa ?? []}
                    searchKeys={['angkatan', 'status_huni']}
                />
            </Card>

            <Drawer
                open={open}
                onClose={() => setOpen(false)}
                title={editing ? 'Edit Mahasiswa' : 'Tambah Mahasiswa'}
                width="w-full max-w-xl"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            form="mahasiswa-form"
                            disabled={processing}
                        >
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                }
            >
                <form id="mahasiswa-form" onSubmit={save} className="space-y-3">
                    <FormField label="NIM">
                        <input
                            className={inputClass}
                            value={data.nim_nip}
                            onChange={(e) => setData('nim_nip', e.target.value)}
                            required
                        />
                        {errors.nim_nip && (
                            <p className="text-error mt-1 text-sm">
                                {errors.nim_nip}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Nama">
                        <input
                            className={inputClass}
                            value={data.nama}
                            onChange={(e) => setData('nama', e.target.value)}
                            required
                        />
                        {errors.nama && (
                            <p className="text-error mt-1 text-sm">
                                {errors.nama}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Email">
                        <input
                            type="email"
                            className={inputClass}
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                        {errors.email && (
                            <p className="text-error mt-1 text-sm">
                                {errors.email}
                            </p>
                        )}
                    </FormField>
                    <FormField
                        label={
                            editing
                                ? 'Password (kosongkan jika tidak diubah)'
                                : 'Password'
                        }
                    >
                        <input
                            type="password"
                            className={inputClass}
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            required={!editing}
                        />
                        {errors.password && (
                            <p className="text-error mt-1 text-sm">
                                {errors.password}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Prodi">
                        <select
                            className={inputClass}
                            value={data.prodi_id}
                            onChange={(e) =>
                                setData('prodi_id', e.target.value)
                            }
                        >
                            <option value="">Pilih prodi</option>
                            {(prodi ?? []).map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                        {errors.prodi_id && (
                            <p className="text-error mt-1 text-sm">
                                {errors.prodi_id}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Angkatan">
                        <input
                            className={inputClass}
                            value={data.angkatan}
                            onChange={(e) =>
                                setData('angkatan', e.target.value)
                            }
                            required={
                                data.client_profile_category !== 'non_student'
                            }
                        />
                        {errors.angkatan && (
                            <p className="text-error mt-1 text-sm">
                                {errors.angkatan}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Kategori client">
                        <select
                            className={inputClass}
                            value={data.client_profile_category}
                            onChange={(e) =>
                                setData(
                                    'client_profile_category',
                                    e.target.value,
                                )
                            }
                        >
                            <option value="local_non_kipk">
                                Mahasiswa lokal non-KIPK
                            </option>
                            <option value="local_kipk">
                                Mahasiswa lokal KIPK
                            </option>
                            <option value="local_resident">
                                Mahasiswa hunian lokal / alumni
                            </option>
                            <option value="international_student">
                                Mahasiswa internasional
                            </option>
                            <option value="international_free_facility">
                                Internasional fasilitas gratis
                            </option>
                            <option value="non_student">Non-mahasiswa</option>
                            <option value="student">
                                Mahasiswa (data lama)
                            </option>
                        </select>
                        {errors.client_profile_category && (
                            <p className="text-error">
                                {errors.client_profile_category}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Jenis kelamin">
                        <select
                            className={inputClass}
                            value={data.gender}
                            onChange={(e) => setData('gender', e.target.value)}
                        >
                            <option value="laki_laki">Laki-laki</option>
                            <option value="perempuan">Perempuan</option>
                        </select>
                    </FormField>
                    <p className="text-muted text-sm">
                        Status hunian mengikuti pendaftaran dan checkout.
                    </p>
                </form>
            </Drawer>

            <ConfirmDialog
                open={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                loading={deletingBusy}
                title="Hapus Mahasiswa"
                message={`Hapus mahasiswa ${deleting?.user?.nama ?? ''}? Tindakan ini tidak dapat dibatalkan.`}
            />
        </div>
    );
}
