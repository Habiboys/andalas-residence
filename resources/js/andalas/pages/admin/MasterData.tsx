import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    Button,
    Drawer,
    DataTable,
    type DataColumn,
    FormField,
    inputClass,
    Tabs,
    Badge,
    ConfirmDialog,
    RowActions,
} from '../../components/ui';
import {
    store as fakultasStore,
    update as fakultasUpdate,
    destroy as fakultasDestroy,
} from '@/routes/admin/master-data/fakultas';
import {
    store as departemenStore,
    update as departemenUpdate,
    destroy as departemenDestroy,
} from '@/routes/admin/master-data/departemen';
import {
    store as prodiStore,
    update as prodiUpdate,
    destroy as prodiDestroy,
} from '@/routes/admin/master-data/prodi';
import {
    store as periodeStore,
    update as periodeUpdate,
    destroy as periodeDestroy,
} from '@/routes/admin/master-data/periode';
import {
    store as provinsiStore,
    update as provinsiUpdate,
    destroy as provinsiDestroy,
} from '@/routes/admin/master-data/provinsi';
import {
    store as kotaStore,
    update as kotaUpdate,
    destroy as kotaDestroy,
} from '@/routes/admin/master-data/kota';
import {
    store as kategoriStore,
    update as kategoriUpdate,
    destroy as kategoriDestroy,
} from '@/routes/admin/master-data/kategori';

import {
    store as typeStore,
    update as typeUpdate,
    destroy as typeDestroy,
} from '@/routes/admin/master-data/jenis-kegiatan';
import {
    store as assignmentStore,
    update as assignmentUpdate,
    destroy as assignmentDestroy,
} from '@/routes/admin/master-data/penugasan';

type Row = Record<string, unknown>;

interface Field {
    key: string;
    label: string;
    type?: 'text' | 'number' | 'date' | 'select' | 'textarea';
    options?: { value: string; label: string }[];
    required?: boolean;
}

interface SectionProps {
    title: string;
    subtitle: string;
    data: Row[];
    store: { url: () => string };
    update: { url: (args: { id: string }) => string };
    destroy: { url: (args: { id: string }) => string };
    columns: DataColumn<Row>[];
    fields: Field[];
    emptyMessage: string;
    rowLabel: (row: Row) => string;
    registerAdd?: (fn: () => void) => void;
}

function MasterCrudSection({
    title,
    subtitle,
    data,
    store,
    update,
    destroy,
    columns,
    fields,
    emptyMessage,
    rowLabel,
    registerAdd,
}: SectionProps) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Row | null>(null);
    const [deleting, setDeleting] = useState<Row | null>(null);
    const {
        data: formData,
        setData,
        post,
        put,
        processing,
        errors,
    } = useForm<Record<string, string>>({});
    const deleteForm = useForm<Record<string, string>>({});

    useEffect(() => {
        registerAdd?.(openCreate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registerAdd]);

    function openCreate() {
        setEditing(null);
        const d: Record<string, string> = {};
        fields.forEach((f) => {
            if (f.options?.length) d[f.key] = f.options[0].value;
        });
        setData(d);
        setOpen(true);
    }

    function openEdit(row: Row) {
        setEditing(row);
        const d: Record<string, string> = {};
        fields.forEach((f) => {
            let v = row[f.key];
            if (v == null && f.key.endsWith('_id')) {
                const rel = row[f.key.replace('_id', '')] as
                    | { id?: string }
                    | undefined;
                v = rel?.id;
            }
            d[f.key] = String(v ?? '');
        });
        setData(d);
        setOpen(true);
    }

    function save(e: React.FormEvent) {
        e.preventDefault();
        if (editing) {
            put(update.url({ id: String(editing.id) }), {
                onSuccess: () => setOpen(false),
            });
        } else {
            post(store.url(), {
                onSuccess: () => setOpen(false),
            });
        }
    }

    function confirmDelete() {
        if (!deleting) return;
        deleteForm.delete(destroy.url({ id: String(deleting.id) }), {
            onSuccess: () => setDeleting(null),
        });
    }

    const actionCol: DataColumn<Row> = {
        key: 'aksi',
        label: '',
        render: (r) => (
            <RowActions
                onEdit={() => openEdit(r)}
                onDelete={() => setDeleting(r)}
            />
        ),
    };

    return (
        <Card>
            <div className="px-4 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-primary font-semibold dark:text-white">
                            {title}
                        </h3>
                        <p className="text-muted dark:text-muted mt-0.5 text-xs">
                            {subtitle}
                        </p>
                    </div>
                    <Button size="sm" onClick={openCreate}>
                        Tambah
                    </Button>
                </div>
            </div>

            <DataTable
                columns={[...columns, actionCol]}
                data={data}
                searchKeys={columns.map((c) => c.key)}
                emptyMessage={emptyMessage}
            />

            <Drawer
                open={open}
                onClose={() => setOpen(false)}
                title={editing ? `Edit ${title}` : `Tambah ${title}`}
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
                            form="master-crud-form"
                            disabled={processing}
                        >
                            Simpan
                        </Button>
                    </div>
                }
            >
                <form
                    id="master-crud-form"
                    onSubmit={save}
                    className="space-y-3"
                >
                    {fields.map((f) => {
                        const options = f.options ?? [];
                        return (
                            <FormField key={f.key} label={f.label}>
                                {f.type === 'textarea' ? (
                                    <textarea
                                        className={inputClass}
                                        rows={3}
                                        value={String(formData[f.key] ?? '')}
                                        onChange={(e) =>
                                            setData(f.key, e.target.value)
                                        }
                                        required={f.required}
                                    />
                                ) : f.type === 'select' ? (
                                    <select
                                        className={`${inputClass} w-full`}
                                        value={String(formData[f.key] ?? '')}
                                        onChange={(e) =>
                                            setData(f.key, e.target.value)
                                        }
                                        required={f.required}
                                    >
                                        <option value="">-- Pilih --</option>
                                        {options.map((o) => (
                                            <option
                                                key={o.value}
                                                value={o.value}
                                            >
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={
                                            f.type === 'date'
                                                ? 'date'
                                                : f.type === 'number'
                                                  ? 'number'
                                                  : 'text'
                                        }
                                        className={`${inputClass} w-full`}
                                        value={String(formData[f.key] ?? '')}
                                        onChange={(e) =>
                                            setData(f.key, e.target.value)
                                        }
                                        required={f.required}
                                    />
                                )}
                                {errors[f.key] && (
                                    <p className="text-error mt-1 text-sm">
                                        {errors[f.key]}
                                    </p>
                                )}
                            </FormField>
                        );
                    })}
                </form>
            </Drawer>

            <ConfirmDialog
                open={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                loading={deleteForm.processing}
                title={`Hapus ${title}`}
                message={`Hapus ${title.toLowerCase()} "${rowLabel(deleting ?? {})}"? Tindakan ini tidak dapat dibatalkan.`}
            />
        </Card>
    );
}

const JENJANG = [
    { value: 'D3', label: 'D3' },
    { value: 'D4', label: 'D4' },
    { value: 'S1', label: 'S1' },
    { value: 'S2', label: 'S2' },
    { value: 'S3', label: 'S3' },
];

type FakultasRow = { id: string; name: string };
type DepartemenRow = { id: string; name: string; faculty?: { name?: string } };
type ProdiRow = {
    id: string;
    name: string;
    jenjang?: string;
    departemen?: { name?: string };
};
type PeriodeRow = {
    id: string;
    nama_periode?: string;
    status?: string;
    tanggal_mulai?: string;
    tanggal_selesai?: string;
};
type ProvinsiRow = { id: string; name: string };
type KotaRow = { id: string; name: string; province?: { name?: string } };
type KategoriRow = {
    id: string;
    nama_kategori?: string;
    tipe?: string;
    kode_rekening?: string;
};

export default function MasterData({
    fakultas = [],
    departemen = [],
    prodi = [],
    periode = [],
    provinsi = [],
    kota = [],
    kategori_transaksi = [],
    jenis_kegiatan = [],
    penugasan = [],
    fasilitator = [],
    gedung = [],
}: {
    fakultas?: FakultasRow[];
    departemen?: DepartemenRow[];
    prodi?: ProdiRow[];
    periode?: PeriodeRow[];
    provinsi?: ProvinsiRow[];
    kota?: KotaRow[];
    kategori_transaksi?: KategoriRow[];
    jenis_kegiatan?: { id: string; nama: string; is_other: boolean }[];
    penugasan?: {
        id: string;
        user_id: string;
        gedung_id: string;
        user: { nama: string };
        gedung: { nama_gedung: string };
    }[];
    fasilitator?: { id: string; nama: string; email: string }[];
    gedung?: { id: string; nama_gedung: string }[];
}) {
    const [tab, setTab] = useState(0);
    const addFns = useRef<Array<() => void>>([]);
    const registerAdd = (i: number) => (fn: () => void) => {
        addFns.current[i] = fn;
    };

    const fakultasOptions = fakultas.map((f) => ({
        value: String(f.id),
        label: f.name,
    }));
    const departemenOptions = departemen.map((d) => ({
        value: String(d.id),
        label: d.name,
    }));
    const provinsiOptions = provinsi.map((p) => ({
        value: String(p.id),
        label: p.name,
    }));

    const tabs: { label: string; section: ReactNode }[] = [
        {
            label: 'Jenis Kegiatan',
            section: (
                <MasterCrudSection
                    title="Jenis Kegiatan"
                    subtitle="Lainnya menyediakan nama kegiatan bebas. Jenis yang sudah digunakan tetap disimpan untuk riwayat."
                    registerAdd={registerAdd(0)}
                    data={jenis_kegiatan}
                    store={typeStore}
                    update={typeUpdate}
                    destroy={typeDestroy}
                    columns={[{ key: 'nama', label: 'Jenis kegiatan' }]}
                    fields={[
                        {
                            key: 'nama',
                            label: 'Nama jenis kegiatan',
                            required: true,
                        },
                    ]}
                    rowLabel={(row) => String(row.nama)}
                    emptyMessage="Belum ada jenis kegiatan."
                />
            ),
        },
        {
            label: 'Penugasan Fasilitator',
            section: (
                <MasterCrudSection
                    title="Penugasan Fasilitator"
                    subtitle="Satu fasilitator bertugas di satu gedung. Satu gedung dapat memiliki beberapa fasilitator. Perubahan penugasan menutup QR aktif petugas tersebut."
                    data={penugasan.map((row) => ({
                        ...row,
                        nama: row.user.nama,
                        nama_gedung: row.gedung.nama_gedung,
                    }))}
                    registerAdd={registerAdd(1)}
                    store={assignmentStore}
                    update={assignmentUpdate}
                    destroy={assignmentDestroy}
                    columns={[
                        { key: 'nama', label: 'Fasilitator' },
                        {
                            key: 'nama_gedung',
                            label: 'Gedung',
                            filter: {
                                type: 'select',
                                options: gedung.map((row) => row.nama_gedung),
                            },
                        },
                    ]}
                    fields={[
                        {
                            key: 'user_id',
                            label: 'Fasilitator',
                            type: 'select',
                            required: true,
                            options: fasilitator.map((row) => ({
                                value: row.id,
                                label: row.nama + ' · ' + row.email,
                            })),
                        },
                        {
                            key: 'gedung_id',
                            label: 'Gedung penugasan',
                            type: 'select',
                            required: true,
                            options: gedung.map((row) => ({
                                value: row.id,
                                label: row.nama_gedung,
                            })),
                        },
                    ]}
                    rowLabel={(row) => String(row.nama)}
                    emptyMessage="Belum ada penugasan fasilitator."
                />
            ),
        },

        {
            label: 'Fakultas',
            section: (
                <MasterCrudSection
                    title="Fakultas"
                    subtitle="Unit akademik tingkat fakultas"
                    data={fakultas}
                    store={fakultasStore}
                    update={fakultasUpdate}
                    destroy={fakultasDestroy}
                    emptyMessage="Belum ada fakultas"
                    rowLabel={(r) => String(r.name ?? '')}
                    registerAdd={registerAdd(2)}
                    fields={[
                        { key: 'name', label: 'Nama Fakultas', required: true },
                    ]}
                    columns={[
                        { key: 'name', label: 'Nama Fakultas', sortable: true },
                        { key: 'departemen_count', label: 'Departemen' },
                    ]}
                />
            ),
        },
        {
            label: 'Departemen',
            section: (
                <MasterCrudSection
                    title="Departemen"
                    subtitle="Departemen di bawah fakultas"
                    data={departemen}
                    store={departemenStore}
                    update={departemenUpdate}
                    destroy={departemenDestroy}
                    emptyMessage="Belum ada departemen"
                    rowLabel={(r) => String(r.name ?? '')}
                    registerAdd={registerAdd(3)}
                    fields={[
                        {
                            key: 'faculty_id',
                            label: 'Fakultas',
                            type: 'select',
                            required: true,
                            options: fakultasOptions,
                        },
                        {
                            key: 'name',
                            label: 'Nama Departemen',
                            required: true,
                        },
                    ]}
                    columns={[
                        {
                            key: 'name',
                            label: 'Nama Departemen',
                            sortable: true,
                        },
                        {
                            key: 'faculty',
                            label: 'Fakultas',
                            render: (r) =>
                                String(
                                    (r.faculty as { name?: string } | undefined)
                                        ?.name ?? '-',
                                ),
                        },
                        { key: 'prodi_count', label: 'Prodi' },
                    ]}
                />
            ),
        },
        {
            label: 'Prodi',
            section: (
                <MasterCrudSection
                    title="Program Studi"
                    subtitle="Program studi di bawah departemen"
                    data={prodi}
                    store={prodiStore}
                    update={prodiUpdate}
                    destroy={prodiDestroy}
                    emptyMessage="Belum ada program studi"
                    rowLabel={(r) => String(r.name ?? '')}
                    registerAdd={registerAdd(4)}
                    fields={[
                        {
                            key: 'departemen_id',
                            label: 'Departemen',
                            type: 'select',
                            required: true,
                            options: departemenOptions,
                        },
                        { key: 'name', label: 'Nama Prodi', required: true },
                        {
                            key: 'jenjang',
                            label: 'Jenjang',
                            type: 'select',
                            required: true,
                            options: JENJANG,
                        },
                    ]}
                    columns={[
                        { key: 'name', label: 'Nama Prodi', sortable: true },
                        { key: 'jenjang', label: 'Jenjang' },
                        {
                            key: 'departemen',
                            label: 'Departemen',
                            render: (r) =>
                                String(
                                    (
                                        r.departemen as
                                            | { name?: string }
                                            | undefined
                                    )?.name ?? '-',
                                ),
                        },
                    ]}
                />
            ),
        },
        {
            label: 'Periode',
            section: (
                <MasterCrudSection
                    title="Periode"
                    subtitle="Periode akademik asrama"
                    data={periode}
                    store={periodeStore}
                    update={periodeUpdate}
                    destroy={periodeDestroy}
                    emptyMessage="Belum ada periode"
                    rowLabel={(r) => String(r.nama_periode ?? '')}
                    registerAdd={registerAdd(5)}
                    fields={[
                        {
                            key: 'nama_periode',
                            label: 'Nama Periode',
                            required: true,
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            type: 'select',
                            required: true,
                            options: [
                                { value: 'aktif', label: 'Aktif' },
                                { value: 'nonaktif', label: 'Nonaktif' },
                            ],
                        },
                        {
                            key: 'tanggal_mulai',
                            label: 'Tanggal Mulai',
                            type: 'date',
                            required: true,
                        },
                        {
                            key: 'tanggal_selesai',
                            label: 'Tanggal Selesai',
                            type: 'date',
                            required: true,
                        },
                    ]}
                    columns={[
                        {
                            key: 'nama_periode',
                            label: 'Nama Periode',
                            sortable: true,
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (r) => (
                                <Badge
                                    color={
                                        (r.status as string) === 'aktif'
                                            ? 'green'
                                            : 'gray'
                                    }
                                >
                                    {String(r.status ?? '')}
                                </Badge>
                            ),
                        },
                        { key: 'tanggal_mulai', label: 'Mulai' },
                        { key: 'tanggal_selesai', label: 'Selesai' },
                    ]}
                />
            ),
        },
        {
            label: 'Provinsi',
            section: (
                <MasterCrudSection
                    title="Provinsi"
                    subtitle="Provinsi asal mahasiswa"
                    data={provinsi}
                    store={provinsiStore}
                    update={provinsiUpdate}
                    destroy={provinsiDestroy}
                    emptyMessage="Belum ada provinsi"
                    rowLabel={(r) => String(r.name ?? '')}
                    registerAdd={registerAdd(6)}
                    fields={[
                        { key: 'name', label: 'Nama Provinsi', required: true },
                    ]}
                    columns={[
                        { key: 'name', label: 'Nama Provinsi', sortable: true },
                        { key: 'cities_count', label: 'Kota/Kabupaten' },
                    ]}
                />
            ),
        },
        {
            label: 'Kota',
            section: (
                <MasterCrudSection
                    title="Kota / Kabupaten"
                    subtitle="Kota/kabupaten di bawah provinsi"
                    data={kota}
                    store={kotaStore}
                    update={kotaUpdate}
                    destroy={kotaDestroy}
                    emptyMessage="Belum ada kota"
                    rowLabel={(r) => String(r.name ?? '')}
                    registerAdd={registerAdd(7)}
                    fields={[
                        {
                            key: 'province_id',
                            label: 'Provinsi',
                            type: 'select',
                            required: true,
                            options: provinsiOptions,
                        },
                        {
                            key: 'name',
                            label: 'Nama Kota/Kabupaten',
                            required: true,
                        },
                    ]}
                    columns={[
                        {
                            key: 'name',
                            label: 'Nama Kota/Kabupaten',
                            sortable: true,
                        },
                        {
                            key: 'province',
                            label: 'Provinsi',
                            render: (r) =>
                                String(
                                    (
                                        r.province as
                                            | { name?: string }
                                            | undefined
                                    )?.name ?? '-',
                                ),
                        },
                    ]}
                />
            ),
        },
        {
            label: 'Kategori Transaksi',
            section: (
                <MasterCrudSection
                    title="Kategori Transaksi"
                    subtitle="Kategori pemasukan/pengeluaran keuangan"
                    data={kategori_transaksi}
                    store={kategoriStore}
                    update={kategoriUpdate}
                    destroy={kategoriDestroy}
                    emptyMessage="Belum ada kategori transaksi"
                    rowLabel={(r) => String(r.nama_kategori ?? '')}
                    registerAdd={registerAdd(8)}
                    fields={[
                        {
                            key: 'nama_kategori',
                            label: 'Nama Kategori',
                            required: true,
                        },
                        {
                            key: 'tipe',
                            label: 'Tipe',
                            type: 'select',
                            required: true,
                            options: [
                                { value: 'pemasukan', label: 'Pemasukan' },
                                { value: 'pengeluaran', label: 'Pengeluaran' },
                            ],
                        },
                        { key: 'kode_rekening', label: 'Kode Rekening' },
                    ]}
                    columns={[
                        {
                            key: 'nama_kategori',
                            label: 'Nama Kategori',
                            sortable: true,
                        },
                        {
                            key: 'tipe',
                            label: 'Tipe',
                            render: (r) => (
                                <Badge
                                    color={
                                        (r.tipe as string) === 'pemasukan'
                                            ? 'green'
                                            : 'red'
                                    }
                                >
                                    {String(r.tipe ?? '')}
                                </Badge>
                            ),
                        },
                        {
                            key: 'kode_rekening',
                            label: 'Kode Rekening',
                            render: (r) => String(r.kode_rekening ?? '-'),
                        },
                        { key: 'transaksi_count', label: 'Transaksi' },
                    ]}
                />
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Data Master"
                subtitle="Kelola data master sistem (superadmin)"
                actions={
                    <Button onClick={() => addFns.current[tab]?.()}>
                        Tambah {tabs[tab]?.label}
                    </Button>
                }
            />
            <Card className="p-4">
                <Tabs
                    tabs={tabs.map((t) => t.label)}
                    active={tab}
                    onChange={setTab}
                />
                <div className="mt-2">{tabs[tab]?.section}</div>
            </Card>
        </div>
    );
}
