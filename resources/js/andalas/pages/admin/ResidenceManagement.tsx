import { router, useForm } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';
import { formatRupiah } from '../../lib/format';
import {
    importMethod as importKipk,
    template as kipkTemplate,
} from '@/routes/andalas/kipk-recipients';
import {
    PageHeader,
    ConfirmDialog,
    DataTable,
    inputClass,
    type DataColumn,
} from '../../components/ui';
import { Modal } from '../../components/atoms/Modal';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    FileUp,
    Pencil,
    Trash2,
} from 'lucide-react';
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
    gender_peruntukan?: string;
    allowed_categories?: string[];
    room_types?: Array<{
        type: string;
        enabled: boolean;
        max_capacity: number | null;
        facilities: string;
    }> | null;
};
type Props = {
    gedung?: Building[];
    periods?: Row[];
    legacy_residents?: Row[];
    legacy_rates?: Row[];
    kipk_recipients?: Row[];
    residence_rates?: Row[];
    rooms?: Row[];
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
    ['student', 'Mahasiswa S1 non-maba'],
    ['non_student', 'Non-mahasiswa'],
    ['summer_course', 'Summer Course'],
];
const earliestHistoricalCohortYear = 1950;
const latestHistoricalCohortYear = 2100;
const currentCohortYear = new Date().getFullYear();

function YearPicker({
    id,
    value,
    onChange,
}: {
    id: string;
    value: string;
    onChange: (year: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [decade, setDecade] = useState(
        Math.floor((Number(value) || currentCohortYear) / 10) * 10,
    );
    const years = Array.from(
        { length: 10 },
        (_, index) => decade + index,
    ).filter(
        (year) =>
            year >= earliestHistoricalCohortYear &&
            year <= latestHistoricalCohortYear,
    );

    function togglePicker() {
        if (!open) {
            const selectedYear = Number(value) || currentCohortYear;
            setDecade(Math.floor(selectedYear / 10) * 10);
        }
        setOpen(!open);
    }

    return (
        <div
            className="relative"
            onBlur={(event) => {
                if (
                    !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                    )
                ) {
                    setOpen(false);
                }
            }}
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    setOpen(false);
                }
            }}
        >
            <button
                type="button"
                className={`${inputClass} flex items-center justify-between gap-2 text-left`}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={id}
                onClick={togglePicker}
            >
                <span>{value || 'Pilih tahun angkatan'}</span>
                <CalendarDays
                    className="text-muted size-4 shrink-0"
                    aria-hidden="true"
                />
            </button>
            {open && (
                <div
                    id={id}
                    role="dialog"
                    aria-label="Kalender tahun angkatan"
                    className="border-base-300 bg-base-100 rounded-box absolute top-full z-20 mt-2 w-full min-w-64 border p-3 shadow-xl"
                >
                    <div className="mb-3 flex items-center justify-between">
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-square"
                            aria-label="Tahun sebelumnya"
                            disabled={decade <= earliestHistoricalCohortYear}
                            onClick={() => setDecade((year) => year - 10)}
                        >
                            <ChevronLeft
                                className="size-4"
                                aria-hidden="true"
                            />
                        </button>
                        <span className="text-sm font-semibold">
                            {decade}–
                            {Math.min(decade + 9, latestHistoricalCohortYear)}
                        </span>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-square"
                            aria-label="Tahun berikutnya"
                            disabled={decade + 10 > latestHistoricalCohortYear}
                            onClick={() => setDecade((year) => year + 10)}
                        >
                            <ChevronRight
                                className="size-4"
                                aria-hidden="true"
                            />
                        </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1" role="grid">
                        {years.map((year) => (
                            <button
                                key={year}
                                type="button"
                                className={`btn btn-sm ${String(year) === value ? 'btn-primary' : 'btn-ghost'}`}
                                aria-label={`Pilih angkatan ${year}`}
                                aria-pressed={String(year) === value}
                                onClick={() => {
                                    onChange(String(year));
                                    setOpen(false);
                                }}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function Editor({
    kind,
    title,
    fields,
    rows,
    buildings,
    actions,
}: {
    kind: string;
    title: string;
    fields: Field[];
    rows: Row[];
    buildings: Building[];
    actions?: ReactNode;
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
    const selectedBuilding = buildings.find((building) =>
        [building.id, building.kode_gedung, building.nama_gedung].includes(
            String(form.data.gedung_id ?? ''),
        ),
    );
    function fieldOptions(field: Field): Array<[string, string]> {
        if (
            field.name === 'tipe_kamar' &&
            selectedBuilding?.room_types != null
        ) {
            return [
                ['', 'Pilih tipe aktif'],
                ...(field.options ?? []).filter(([value]) =>
                    selectedBuilding.room_types?.some(
                        (type) => type.type === value && type.enabled,
                    ),
                ),
            ];
        }
        return field.options ?? [];
    }

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
                    if (field.type === 'number') {
                        return [
                            field.name,
                            value === null || value === undefined
                                ? ''
                                : String(Number(value)),
                        ];
                    }
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

                const value = row[field.name];
                if (
                    [
                        'amount',
                        'jumlah',
                        'student_amount',
                        'room_amount',
                    ].includes(field.name) &&
                    value !== null &&
                    value !== undefined
                ) {
                    return formatRupiah(Number(value));
                }

                return Array.isArray(value)
                    ? value.join(', ')
                    : String(value ?? '-');
            },
            render: (row: Row) => {
                if (field.name === 'gedung_id') {
                    return (
                        buildings.find(
                            (building) => building.id === row.gedung_id,
                        )?.nama_gedung ?? 'Perlu dilengkapi'
                    );
                }

                const value = row[field.name];
                if (
                    [
                        'amount',
                        'jumlah',
                        'student_amount',
                        'room_amount',
                    ].includes(field.name) &&
                    value !== null &&
                    value !== undefined
                ) {
                    return formatRupiah(Number(value));
                }

                return Array.isArray(value)
                    ? value.join(', ')
                    : String(value ?? '-');
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
                    {!['room', 'room-type'].includes(kind) && (
                        <button
                            type="button"
                            className="btn btn-ghost btn-xs btn-square text-error"
                            onClick={() => setDeleteTarget(row)}
                            aria-label={`Hapus ${title}`}
                            title="Hapus"
                        >
                            <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <section className="border-base-300 space-y-4 border-t pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{title}</h2>
                <div className="flex flex-wrap items-center gap-3">
                    {actions}
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={openCreate}
                    >
                        Tambah data
                    </button>
                </div>
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
                                ) : field.type === 'year' ? (
                                    <YearPicker
                                        id={`year-picker-${kind}-${field.name}`}
                                        value={String(
                                            form.data[field.name] ?? '',
                                        )}
                                        onChange={(year) =>
                                            form.setData(field.name, year)
                                        }
                                    />
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
                                        {fieldOptions(field).map(
                                            ([value, label]) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                ) : (
                                    <input
                                        className={inputClass}
                                        type={
                                            field.type === 'number'
                                                ? 'text'
                                                : (field.type ?? 'text')
                                        }
                                        inputMode={
                                            field.type === 'number'
                                                ? 'numeric'
                                                : undefined
                                        }
                                        pattern={
                                            field.type === 'number'
                                                ? '[0-9]+'
                                                : undefined
                                        }
                                        value={String(
                                            form.data[field.name] ?? '',
                                        )}
                                        onChange={(event) =>
                                            form.setData(
                                                field.name,
                                                field.type === 'number' &&
                                                    !/^[0-9]*$/.test(
                                                        event.target.value,
                                                    )
                                                    ? String(
                                                          form.data[
                                                              field.name
                                                          ] ?? '',
                                                      )
                                                    : event.target.value,
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
        </section>
    );
}

export default function ResidenceManagement({
    gedung = [],
    periods = [],
    legacy_residents = [],
    legacy_rates = [],
    kipk_recipients = [],
    residence_rates = [],
    rooms = [],
}: Props) {
    const [tab, setTab] = useState('legacy');
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [kipkImportOpen, setKipkImportOpen] = useState(false);
    const kipkUpload = useForm({ file: null as File | null });
    const upload = useForm({ file: null as File | null });
    const closeImportModal = () => {
        setImportModalOpen(false);
        upload.reset();
    };
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
            <Modal
                open={kipkImportOpen}
                onClose={() => {
                    setKipkImportOpen(false);
                    kipkUpload.reset();
                    kipkUpload.clearErrors();
                }}
                title="Impor penerima KIP-K"
            >
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        kipkUpload.post(importKipk.url(), {
                            onSuccess: () => {
                                setKipkImportOpen(false);
                                kipkUpload.reset();
                            },
                        });
                    }}
                >
                    <p>
                        Gunakan dua kolom nama dan nim, satu sheet, maksimal 500
                        baris. Impor ulang memperbarui nama berdasarkan NIM.
                    </p>
                    <a className="link link-primary" href={kipkTemplate.url()}>
                        Unduh template Excel
                    </a>
                    <input
                        className="file-input w-full"
                        type="file"
                        required
                        accept=".xlsx,.xls,.csv"
                        onChange={(event) =>
                            kipkUpload.setData(
                                'file',
                                event.target.files?.[0] ?? null,
                            )
                        }
                    />
                    {kipkUpload.errors.file && (
                        <p role="alert" className="text-error">
                            {kipkUpload.errors.file}
                        </p>
                    )}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setKipkImportOpen(false)}
                        >
                            Batal
                        </button>
                        <button
                            className="btn btn-primary"
                            disabled={
                                kipkUpload.processing || !kipkUpload.data.file
                            }
                        >
                            Impor
                        </button>
                    </div>
                </form>
            </Modal>
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
                                type: 'year',
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
                        actions={
                            <div>
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setImportModalOpen(true)}
                                >
                                    <FileUp
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Impor arsip alumni
                                </button>
                            </div>
                        }
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
                    <Modal
                        open={importModalOpen}
                        onClose={closeImportModal}
                        title="Impor arsip alumni"
                    >
                        <div className="space-y-4">
                            <p className="text-sm">
                                Excel/CSV, satu sheet, maksimal 500 baris. Isi
                                hanya nama, NIM, dan gedung. NIM duplikat
                                ditolak dan seluruh impor dibatalkan.
                            </p>
                            <a
                                download="template-alumni.csv"
                                href={
                                    'data:text/csv;charset=utf-8,' +
                                    encodeURIComponent('nama,nim,gedung\n')
                                }
                                className="link link-primary text-sm"
                            >
                                Unduh template CSV
                            </a>
                            <form
                                className="space-y-3"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    upload.post(importMethod.url(), {
                                        preserveScroll: true,
                                        onSuccess: closeImportModal,
                                    });
                                }}
                            >
                                <input
                                    aria-label="Berkas alumni"
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    className="file-input file-input-bordered w-full"
                                    onChange={(e) =>
                                        upload.setData(
                                            'file',
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                                {upload.errors.file && (
                                    <p
                                        role="alert"
                                        className="text-error text-sm"
                                    >
                                        {upload.errors.file}
                                    </p>
                                )}
                                <div className="modal-action mt-0">
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={closeImportModal}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        disabled={
                                            upload.processing ||
                                            !upload.data.file
                                        }
                                        className="btn btn-primary"
                                    >
                                        {upload.processing
                                            ? 'Mengimpor...'
                                            : 'Impor'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </Modal>
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
                        actions={
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setKipkImportOpen(true)}
                            >
                                <FileUp className="size-4" />
                                Impor Excel
                            </button>
                        }
                        rows={kipk_recipients}
                        buildings={orderedBuildings}
                        fields={[
                            { name: 'nim', label: 'NIM' },
                            { name: 'nama', label: 'Nama' },
                        ]}
                    />
                    <Editor
                        kind="room-type"
                        title="Jenis tipe kamar per gedung"
                        rows={orderedBuildings.flatMap((building) =>
                            (building.room_types ?? []).map((type) => ({
                                gedung_id: building.id,
                                type: type.type,
                                enabled: type.enabled ? 1 : 0,
                                max_capacity: type.max_capacity,
                                facilities: type.facilities,
                            })),
                        )}
                        buildings={orderedBuildings}
                        fields={[
                            buildingField,
                            {
                                name: 'type',
                                label: 'Tipe',
                                options: [
                                    ['standar', 'Standar'],
                                    ['medium', 'Medium'],
                                    ['premium', 'Premium'],
                                    ['umum', 'Umum'],
                                    ['umum_vip', 'Umum VIP'],
                                ],
                            },
                            {
                                name: 'enabled',
                                label: 'Tersedia',
                                options: [
                                    ['1', 'Ya'],
                                    ['0', 'Tidak'],
                                ],
                            },
                            {
                                name: 'max_capacity',
                                label: 'Kapasitas maksimal (orang)',
                                type: 'number',
                                optional: true,
                            },
                            {
                                name: 'facilities',
                                label: 'Fasilitas',
                                optional: true,
                            },
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
                                    ['umum', 'Umum'],
                                    ['umum_vip', 'Umum VIP'],
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
                                name: 'student_amount',
                                label: 'Tarif harian mahasiswa (Rp)',
                                type: 'number',
                                optional: true,
                            },
                            {
                                name: 'room_amount',
                                label: 'Tarif tahunan per kamar (Rp)',
                                type: 'number',
                                optional: true,
                            },
                        ]}
                    />
                    <Editor
                        kind="room"
                        title="Nomor dan kondisi kamar"
                        rows={rooms.filter((row) =>
                            visibleBuildingIds.has(String(row.gedung_id ?? '')),
                        )}
                        buildings={orderedBuildings}
                        fields={[
                            {
                                name: 'id',
                                label: 'ID',
                                hidden: true,
                                optional: true,
                            },
                            buildingField,
                            {
                                name: 'nomor_lantai',
                                label: 'Lantai',
                                type: 'number',
                            },
                            { name: 'nomor_kamar', label: 'Nomor kamar' },
                            {
                                name: 'tipe_kamar',
                                label: 'Tipe',
                                options: [
                                    ['standar', 'Standar'],
                                    ['medium', 'Medium'],
                                    ['premium', 'Premium'],
                                    ['umum', 'Umum'],
                                    ['umum_vip', 'Umum VIP'],
                                ],
                            },
                            {
                                name: 'kapasitas',
                                label: 'Kapasitas',
                                type: 'number',
                            },
                            {
                                name: 'status',
                                label: 'Kondisi',
                                options: [
                                    [
                                        'kosong',
                                        'Siap digunakan (status hunian otomatis)',
                                    ],
                                    [
                                        'terisi_sebagian',
                                        'Terisi sebagian (otomatis)',
                                    ],
                                    ['penuh', 'Penuh (otomatis)'],
                                    ['maintenance', 'Rusak / tidak tersedia'],
                                ],
                            },
                        ]}
                    />
                    <Editor
                        kind="building"
                        title="Kategori penghuni per gedung"
                        rows={orderedBuildings.map((b) => ({
                            id: b.id,
                            kode_gedung: b.kode_gedung,
                            nama_gedung: b.nama_gedung,
                            gender_peruntukan: b.gender_peruntukan ?? 'campur',
                            allowed_categories: b.allowed_categories ?? [],
                            gedung_id: b.id,
                        }))}
                        buildings={orderedBuildings}
                        fields={[
                            { ...buildingField, optional: true },
                            {
                                name: 'kode_gedung',
                                label: 'Kode gedung baru / kode gedung',
                                optional: true,
                            },
                            {
                                name: 'nama_gedung',
                                label: 'Nama gedung',
                                optional: true,
                            },
                            {
                                name: 'gender_peruntukan',
                                label: 'Peruntukan',
                                options: [
                                    ['campur', 'Campur'],
                                    ['perempuan', 'Perempuan'],
                                    ['laki_laki', 'Laki-laki'],
                                ],
                            },
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
