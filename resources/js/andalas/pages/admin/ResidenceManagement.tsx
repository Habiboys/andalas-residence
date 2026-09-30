import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    PageHeader,
    Card,
    ConfirmDialog,
    DataTable,
    inputClass,
    type DataColumn,
} from '../../components/ui';
import { Modal } from '../../components/atoms/Modal';
import { Pencil, Trash2 } from 'lucide-react';
import {
    destroy as destroyResidenceManagement,
    save,
} from '@/routes/andalas/residence-management';
import { importMethod } from '@/routes/andalas/legacy-residents';

type Row = Record<string, string | number | string[] | null>;
type Building = {
    id: string;
    kode_gedung: string;
    nama_gedung: string;
    allowed_categories?: string[];
};
type Props = {
    gedung?: Building[];
    periods?: Row[];
    legacy_residents?: Row[];
    legacy_rates?: Row[];
    kipk_recipients?: Row[];
    residence_rates?: Row[];
};
type Field = {
    name: string;
    label: string;
    type?: string;
    options?: Array<[string, string]>;
    optional?: boolean;
    hidden?: boolean;
};
const categories: Array<[string, string]> = [
    ['local_kipk', 'Lokal KIP-K'],
    ['local_non_kipk', 'Lokal non-KIP-K'],
    ['international_student', 'Internasional/S2/S3 pribadi'],
    ['international_free_facility', 'Internasional/S2/S3 ditanggung'],
    ['non_student', 'Non-mahasiswa'],
];

function Editor({
    kind,
    title,
    fields,
    rows,
    buildings,
}: {
    kind: string;
    title: string;
    fields: Field[];
    rows: Row[];
    buildings: Building[];
}) {
    const initial: Record<string, string | string[]> = Object.fromEntries(
        fields.map((field) => [
            field.name,
            field.type === 'categories'
                ? []
                : (field.options?.[0]?.[0] ??
                  (field.name === 'reservation_hours' ? '24' : '')),
        ]),
    );
    const form = useForm(initial);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);

    function closeForm() {
        setModalOpen(false);
        setEditing(false);
        form.reset();
        form.clearErrors();
    }

    function openCreate() {
        form.reset();
        form.clearErrors();
        setEditing(false);
        setModalOpen(true);
    }

    function openEdit(row: Row) {
        form.clearErrors();
        form.setData(
            Object.fromEntries(
                fields.map((field) => {
                    const value = row[field.name];
                    if (field.type === 'categories') {
                        return [field.name, Array.isArray(value) ? value : []];
                    }
                    if (field.name === 'nama_periode') {
                        const year = String(value ?? '').match(/20\d{2}/)?.[0];
                        return [
                            field.name,
                            year
                                ? `${year}/${Number(year) + 1}`
                                : String(value ?? ''),
                        ];
                    }
                    return [
                        field.name,
                        String(value ?? '').slice(
                            0,
                            field.type === 'date' ? 10 : undefined,
                        ),
                    ];
                }),
            ) as Record<string, string | string[]>,
        );
        setEditing(true);
        setModalOpen(true);
    }

    function confirmDelete() {
        if (!deleteTarget) {
            return;
        }
        setDeleting(true);
        const identifiers = Object.fromEntries(
            (kind === 'legacy'
                ? ['nim']
                : kind === 'legacy-rate'
                  ? ['angkatan', 'gedung_id']
                  : kind === 'kipk'
                    ? ['nim']
                    : kind === 'rate'
                      ? ['gedung_id', 'tipe_kamar', 'unit']
                      : kind === 'building'
                        ? ['gedung_id']
                        : ['id']
            ).map((name) => [name, deleteTarget[name]]),
        );
        router.delete(destroyResidenceManagement.url({ kind }), {
            data: identifiers,
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
            onFinish: () => setDeleting(false),
        });
    }

    const visibleFields = fields.filter(
        (field) => field.name !== 'id' && !field.hidden,
    );
    const columns: DataColumn<Row>[] = [
        ...visibleFields.map((field) => ({
            key: field.name,
            label: field.label,
            value: (row: Row) => {
                if (field.name === 'gedung_id') {
                    return (
                        buildings.find(
                            (building) => building.id === row.gedung_id,
                        )?.nama_gedung ?? 'Perlu dilengkapi'
                    );
                }

                return Array.isArray(row[field.name])
                    ? row[field.name].join(', ')
                    : String(row[field.name] ?? '-');
            },
            render: (row: Row) => {
                if (field.name === 'gedung_id') {
                    return (
                        buildings.find(
                            (building) => building.id === row.gedung_id,
                        )?.nama_gedung ?? 'Perlu dilengkapi'
                    );
                }

                return Array.isArray(row[field.name])
                    ? row[field.name].join(', ')
                    : String(row[field.name] ?? '-');
            },
        })),
        {
            key: 'aksi',
            label: 'Aksi',
            action: true,
            render: (row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-square"
                        onClick={() => openEdit(row)}
                        aria-label={`Ubah ${title}`}
                        title="Ubah"
                    >
                        <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-square text-error"
                        onClick={() => setDeleteTarget(row)}
                        aria-label={`Hapus ${title}`}
                        title="Hapus"
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button className="btn btn-primary btn-sm" onClick={openCreate}>
                    Tambah data
                </button>
            </div>
            <DataTable
                columns={columns}
                data={rows}
                searchKeys={visibleFields.map((field) => field.name)}
                emptyMessage="Belum ada data."
            />

            <Modal
                open={modalOpen}
                onClose={closeForm}
                title={`${editing ? 'Ubah' : 'Tambah'} ${title}`}
                width="max-w-2xl"
            >
                <form
                    className="grid gap-3 sm:grid-cols-2"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(save.url({ kind }), {
                            preserveScroll: true,
                            onSuccess: closeForm,
                        });
                    }}
                >
                    {fields
                        .filter((field) => !field.hidden)
                        .map((field) => (
                            <label
                                className="space-y-1 text-sm"
                                key={field.name}
                            >
                                <span>{field.label}</span>
                                {field.type === 'categories' ? (
                                    <div className="space-y-2">
                                        {categories.map(([value, label]) => (
                                            <label
                                                key={value}
                                                className="flex gap-2"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={(
                                                        form.data[
                                                            field.name
                                                        ] as string[]
                                                    ).includes(value)}
                                                    onChange={(event) =>
                                                        form.setData(
                                                            field.name,
                                                            event.target.checked
                                                                ? [
                                                                      ...(form
                                                                          .data[
                                                                          field
                                                                              .name
                                                                      ] as string[]),
                                                                      value,
                                                                  ]
                                                                : (
                                                                      form.data[
                                                                          field
                                                                              .name
                                                                      ] as string[]
                                                                  ).filter(
                                                                      (item) =>
                                                                          item !==
                                                                          value,
                                                                  ),
                                                        )
                                                    }
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                ) : field.type === 'building' ? (
                                    <>
                                        <input
                                            className={inputClass}
                                            list={`buildings-${kind}-${field.name}`}
                                            value={
                                                buildings.find(
                                                    (building) =>
                                                        building.id ===
                                                        String(
                                                            form.data[
                                                                field.name
                                                            ] ?? '',
                                                        ),
                                                )?.nama_gedung ??
                                                String(
                                                    form.data[field.name] ?? '',
                                                )
                                            }
                                            onChange={(event) =>
                                                form.setData(
                                                    field.name,
                                                    event.target.value,
                                                )
                                            }
                                            required={!field.optional}
                                        />
                                        <datalist
                                            id={`buildings-${kind}-${field.name}`}
                                        >
                                            {buildings.map((building) => (
                                                <option
                                                    key={building.id}
                                                    value={building.nama_gedung}
                                                />
                                            ))}
                                        </datalist>
                                    </>
                                ) : field.options ? (
                                    <select
                                        className={inputClass}
                                        value={String(
                                            form.data[field.name] ?? '',
                                        )}
                                        onChange={(event) =>
                                            form.setData(
                                                field.name,
                                                event.target.value,
                                            )
                                        }
                                        required={!field.optional}
                                    >
                                        {field.options.map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        className={inputClass}
                                        type={field.type ?? 'text'}
                                        value={String(
                                            form.data[field.name] ?? '',
                                        )}
                                        onChange={(event) =>
                                            form.setData(
                                                field.name,
                                                event.target.value,
                                            )
                                        }
                                        required={!field.optional}
                                    />
                                )}
                                {form.errors[field.name] && (
                                    <span
                                        role="alert"
                                        className="text-error text-xs"
                                    >
                                        {form.errors[field.name]}
                                    </span>
                                )}
                            </label>
                        ))}
                    <div className="flex justify-end gap-2 sm:col-span-2">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={closeForm}
                            disabled={form.processing}
                        >
                            Batal
                        </button>
                        <button
                            className="btn btn-primary"
                            disabled={form.processing}
                        >
                            {form.processing ? 'Menyimpan?' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                loading={deleting}
                title="Hapus data pengaturan?"
                message={
                    kind === 'building'
                        ? 'Batasan kategori pada gedung ini akan dihapus. Setelahnya, semua kategori penghuni dapat menggunakan gedung ini.'
                        : 'Data ini akan dihapus dan tindakan ini tidak dapat dibatalkan.'
                }
            />
        </Card>
    );
}

export default function ResidenceManagement({
    gedung = [],
    periods = [],
    legacy_residents = [],
    legacy_rates = [],
    kipk_recipients = [],
    residence_rates = [],
}: Props) {
    const [tab, setTab] = useState('legacy');
    const upload = useForm({ file: null as File | null });
    const buildingOrder = [
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'Nakes',
        'ASN',
    ];
    const orderedBuildings = [...gedung]
        .filter(
            (building) =>
                !building.kode_gedung.toUpperCase().startsWith('DEMO'),
        )
        .sort((a, b) => {
            const indexA = buildingOrder.indexOf(a.kode_gedung);
            const indexB = buildingOrder.indexOf(b.kode_gedung);
            return (indexA < 0 ? 999 : indexA) - (indexB < 0 ? 999 : indexB);
        });
    const visibleBuildingIds = new Set(
        orderedBuildings.map((building) => building.id),
    );
    const buildings: Array<[string, string]> = [
        ['', 'Pilih gedung'],
        ...orderedBuildings.map(
            (b) =>
                [
                    b.id,
                    b.nama_gedung.includes(`(${b.kode_gedung})`)
                        ? b.nama_gedung
                        : `${b.nama_gedung} (${b.kode_gedung})`,
                ] as [string, string],
        ),
    ];
    const buildingField: Field = {
        name: 'gedung_id',
        label: 'Gedung',
        options: buildings,
    };
    const buildingTextField: Field = {
        name: 'gedung_id',
        label: 'Gedung',
        type: 'building',
    };
    return (
        <div className="space-y-5">
            <PageHeader
                title="Pengaturan Layanan"
                subtitle="Arsip alumni, tarif, penerimaan, dan kategori penghuni."
            />
            <div className="flex flex-wrap gap-2">
                {[
                    ['legacy', 'Bebas asrama'],
                    ['registration', 'Pendaftaran'],
                ].map(([v, l]) => (
                    <button
                        key={v}
                        className={`btn ${tab === v ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setTab(v)}
                    >
                        {l}
                    </button>
                ))}
            </div>
            {tab === 'legacy' ? (
                <>
                    <Editor
                        kind="legacy-rate"
                        title="Tarif historis per gedung dan angkatan"
                        fields={[
                            {
                                name: 'angkatan',
                                label: 'Tahun angkatan',
                                type: 'number',
                            },
                            buildingTextField,
                            {
                                name: 'jumlah',
                                label: 'Nominal (Rp)',
                                type: 'number',
                            },
                        ]}
                        rows={legacy_rates.filter((row) =>
                            visibleBuildingIds.has(String(row.gedung_id ?? '')),
                        )}
                        buildings={orderedBuildings}
                    />
                    <Editor
                        kind="legacy"
                        title="Arsip alumni yang sudah check-out (angkatan 2025 dan sebelumnya)"
                        fields={[
                            { name: 'nama', label: 'Nama' },
                            { name: 'nim', label: 'NIM' },
                            buildingTextField,
                        ]}
                        rows={legacy_residents.filter((row) =>
                            visibleBuildingIds.has(String(row.gedung_id ?? '')),
                        )}
                        buildings={orderedBuildings}
                    />
                    <Card className="space-y-3 p-5">
                        <h2 className="font-semibold">Impor arsip alumni</h2>
                        <p className="text-sm">
                            Excel/CSV, satu sheet, maksimal 500 baris. Isi hanya
                            nama, NIM, dan gedung. NIM duplikat ditolak dan
                            seluruh impor dibatalkan.
                        </p>
                        <a
                            download="template-alumni.csv"
                            href={
                                'data:text/csv;charset=utf-8,' +
                                encodeURIComponent('nama,nim,gedung\n')
                            }
                            className="link"
                        >
                            Unduh template CSV
                        </a>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                upload.post(importMethod.url(), {
                                    preserveScroll: true,
                                });
                            }}
                        >
                            <input
                                aria-label="Berkas alumni"
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={(e) =>
                                    upload.setData(
                                        'file',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                            />
                            <button
                                disabled={
                                    upload.processing || !upload.data.file
                                }
                                className="btn btn-primary"
                            >
                                Impor
                            </button>
                            {upload.errors.file && (
                                <p role="alert" className="text-error">
                                    {upload.errors.file}
                                </p>
                            )}
                        </form>
                    </Card>
                </>
            ) : (
                <>
                    <Editor
                        kind="period"
                        title="Periode penerimaan"
                        rows={periods.filter(
                            (period) =>
                                !String(period.nama_periode ?? '').startsWith(
                                    'DEMO',
                                ),
                        )}
                        buildings={orderedBuildings}
                        fields={[
                            {
                                name: 'id',
                                label: 'ID periode',
                                optional: true,
                                hidden: true,
                            },
                            {
                                name: 'nama_periode',
                                label: 'Tahun Ajaran',
                                options: Array.from(
                                    { length: 75 },
                                    (_, index) => {
                                        const year = 2025 + index;
                                        return [
                                            `${year}/${year + 1}`,
                                            `${year}/${year + 1}`,
                                        ] as [string, string];
                                    },
                                ),
                            },
                            {
                                name: 'status',
                                label: 'Status',
                                options: [
                                    ['aktif', 'Aktif'],
                                    ['nonaktif', 'Nonaktif'],
                                ],
                            },
                            {
                                name: 'tanggal_mulai',
                                label: 'Mulai hunian',
                                type: 'date',
                            },
                            {
                                name: 'tanggal_selesai',
                                label: 'Akhir hunian',
                                type: 'date',
                            },
                            {
                                name: 'reservation_hours',
                                label: 'Batas reservasi (jam)',
                                type: 'number',
                            },
                        ]}
                    />
                    <Editor
                        kind="kipk"
                        title="Penerima KIP-K"
                        rows={kipk_recipients}
                        buildings={orderedBuildings}
                        fields={[
                            { name: 'nim', label: 'NIM' },
                            { name: 'nama', label: 'Nama' },
                        ]}
                    />
                    <Editor
                        kind="rate"
                        title="Tarif gedung dan tipe kamar"
                        rows={residence_rates.filter((row) =>
                            visibleBuildingIds.has(String(row.gedung_id ?? '')),
                        )}
                        buildings={orderedBuildings}
                        fields={[
                            buildingTextField,
                            {
                                name: 'tipe_kamar',
                                label: 'Tipe',
                                options: [
                                    ['standar', 'Standar'],
                                    ['medium', 'Medium'],
                                    ['premium', 'Premium'],
                                ],
                            },
                            {
                                name: 'unit',
                                label: 'Satuan',
                                options: [
                                    ['year', 'Per tahun'],
                                    ['month', 'Per bulan'],
                                    ['day', 'Per hari'],
                                ],
                            },
                            {
                                name: 'amount',
                                label: 'Tarif (Rp)',
                                type: 'number',
                            },
                            {
                                name: 'facilities',
                                label: 'Fasilitas per tipe kamar',
                                optional: true,
                            },
                        ]}
                    />
                    <Editor
                        kind="building"
                        title="Kategori penghuni per gedung"
                        rows={orderedBuildings.map((b) => ({
                            ...b,
                            gedung_id: b.id,
                        }))}
                        buildings={orderedBuildings}
                        fields={[
                            buildingField,
                            {
                                name: 'allowed_categories',
                                label: 'Kategori yang diizinkan',
                                type: 'categories',
                            },
                        ]}
                    />
                </>
            )}
        </div>
    );
}
