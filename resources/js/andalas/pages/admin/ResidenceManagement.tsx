import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { PageHeader, Card, inputClass } from '../../components/ui';
import { save } from '@/routes/andalas/residence-management';
import { importMethod } from '@/routes/andalas/legacy-residents';

type Row = Record<string, string | number | string[] | null>;
type Building = {
    id: string;
    kode_gedung: string;
    nama_gedung: string;
    allowed_categories?: string[];
};
type Props = {
    gedung: Building[];
    periods: Row[];
    legacy_residents: Row[];
    legacy_rates: Row[];
    kipk_recipients: Row[];
    residence_rates: Row[];
};
type Field = {
    name: string;
    label: string;
    type?: string;
    options?: Array<[string, string]>;
    optional?: boolean;
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
        fields.map((f) => [
            f.name,
            f.type === 'categories'
                ? []
                : (f.options?.[0]?.[0] ??
                  (f.name === 'reservation_hours' ? '24' : '')),
        ]),
    );
    const form = useForm(initial);
    return (
        <Card className="space-y-4 p-5">
            <h2 className="text-lg font-semibold">{title}</h2>
            <form
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post(save.url({ kind }), { preserveScroll: true });
                }}
            >
                {fields.map((field) => (
                    <label className="space-y-1 text-sm" key={field.name}>
                        <span>{field.label}</span>
                        {field.type === 'categories' ? (
                            <div className="space-y-2">
                                {categories.map(([value, label]) => (
                                    <label key={value} className="flex gap-2">
                                        <input
                                            type="checkbox"
                                            checked={(
                                                form.data[
                                                    field.name
                                                ] as string[]
                                            ).includes(value)}
                                            onChange={(e) =>
                                                form.setData(
                                                    field.name,
                                                    e.target.checked
                                                        ? [
                                                              ...(form.data[
                                                                  field.name
                                                              ] as string[]),
                                                              value,
                                                          ]
                                                        : (
                                                              form.data[
                                                                  field.name
                                                              ] as string[]
                                                          ).filter(
                                                              (v) =>
                                                                  v !== value,
                                                          ),
                                                )
                                            }
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        ) : field.options ? (
                            <select
                                className={inputClass}
                                value={String(form.data[field.name] ?? '')}
                                onChange={(e) =>
                                    form.setData(field.name, e.target.value)
                                }
                                required={!field.optional}
                            >
                                {field.options.map(([v, l]) => (
                                    <option key={v} value={v}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                className={inputClass}
                                type={field.type ?? 'text'}
                                value={String(form.data[field.name] ?? '')}
                                onChange={(e) =>
                                    form.setData(field.name, e.target.value)
                                }
                                required={!field.optional}
                            />
                        )}
                    </label>
                ))}
                <div className="sm:col-span-2">
                    {Object.values(form.errors).map((error, i) => (
                        <p role="alert" className="text-error text-sm" key={i}>
                            {error}
                        </p>
                    ))}
                    <button
                        className="btn btn-primary mt-2"
                        disabled={form.processing}
                    >
                        Simpan
                    </button>{' '}
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => form.setData(initial)}
                    >
                        Data baru
                    </button>
                </div>
            </form>
            <div className="overflow-x-auto">
                <table className="table-sm table">
                    <thead>
                        <tr>
                            {fields
                                .filter((f) => f.name !== 'id')
                                .map((f) => (
                                    <th key={f.name}>{f.label}</th>
                                ))}
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={String(row.id ?? index)}>
                                {fields
                                    .filter((f) => f.name !== 'id')
                                    .map((f) => (
                                        <td key={f.name}>
                                            {f.name === 'gedung_id'
                                                ? (buildings.find(
                                                      (b) =>
                                                          b.id ===
                                                          row.gedung_id,
                                                  )?.nama_gedung ??
                                                  'Perlu dilengkapi')
                                                : Array.isArray(row[f.name])
                                                  ? (
                                                        row[f.name] as string[]
                                                    ).join(', ')
                                                  : String(row[f.name] ?? '-')}
                                        </td>
                                    ))}
                                <td>
                                    <button
                                        className="btn btn-ghost btn-xs"
                                        onClick={() =>
                                            form.setData(
                                                Object.fromEntries(
                                                    fields.map((f) => [
                                                        f.name,
                                                        f.type === 'categories'
                                                            ? (row[f.name] ??
                                                              [])
                                                            : String(
                                                                  row[f.name] ??
                                                                      '',
                                                              ).slice(
                                                                  0,
                                                                  f.type ===
                                                                      'date'
                                                                      ? 10
                                                                      : undefined,
                                                              ),
                                                    ]),
                                                ) as Record<
                                                    string,
                                                    string | string[]
                                                >,
                                            )
                                        }
                                    >
                                        Ubah
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rows.length === 0 && (
                    <p className="py-3 text-sm">Belum ada data.</p>
                )}
            </div>
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
    const buildings: Array<[string, string]> = [
        ['', 'Pilih gedung'],
        ...gedung.map(
            (b) =>
                [b.id, `${b.kode_gedung} ? ${b.nama_gedung}`] as [
                    string,
                    string,
                ],
        ),
    ];
    const buildingField: Field = {
        name: 'gedung_id',
        label: 'Gedung',
        options: buildings,
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
                            buildingField,
                            {
                                name: 'jumlah',
                                label: 'Nominal (Rp)',
                                type: 'number',
                            },
                        ]}
                        rows={legacy_rates}
                        buildings={gedung}
                    />
                    <Editor
                        kind="legacy"
                        title="Arsip alumni yang sudah check-out (angkatan ?2025)"
                        fields={[
                            { name: 'nim', label: 'NIM' },
                            { name: 'nama', label: 'Nama' },
                            buildingField,
                            {
                                name: 'checked_out_at',
                                label: 'Tanggal check-out jika tersedia',
                                type: 'date',
                                optional: true,
                            },
                            {
                                name: 'notes',
                                label: 'Keterangan arsip',
                                optional: true,
                            },
                        ]}
                        rows={legacy_residents}
                        buildings={gedung}
                    />
                    <Card className="space-y-3 p-5">
                        <h2 className="font-semibold">Impor arsip alumni</h2>
                        <p className="text-sm">
                            Excel/CSV, satu sheet, maksimal 500 baris. Kolom:
                            nim, nama, kode_gedung, checked_out_at, notes.
                            Tanggal YYYY-MM-DD; tanggal boleh kosong. NIM
                            duplikat ditolak dan seluruh impor dibatalkan.
                        </p>
                        <a
                            download="template-alumni.csv"
                            href={
                                'data:text/csv;charset=utf-8,' +
                                encodeURIComponent(
                                    'nim,nama,kode_gedung,checked_out_at,notes\n',
                                )
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
                        rows={periods}
                        buildings={gedung}
                        fields={[
                            {
                                name: 'id',
                                label: 'ID (kosong untuk periode baru)',
                                optional: true,
                            },
                            { name: 'nama_periode', label: 'Nama periode' },
                            {
                                name: 'angkatan_maba',
                                label: 'Tahun angkatan maba',
                                type: 'number',
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
                        buildings={gedung}
                        fields={[
                            { name: 'nim', label: 'NIM' },
                            { name: 'nama', label: 'Nama' },
                        ]}
                    />
                    <Editor
                        kind="rate"
                        title="Tarif gedung dan tipe kamar"
                        rows={residence_rates}
                        buildings={gedung}
                        fields={[
                            buildingField,
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
                                    ['period', 'Per periode'],
                                    ['day', 'Per hari'],
                                ],
                            },
                            {
                                name: 'amount',
                                label: 'Tarif (Rp)',
                                type: 'number',
                            },
                        ]}
                    />
                    <Editor
                        kind="building"
                        title="Kategori penghuni per gedung"
                        rows={gedung.map((b) => ({ ...b, gedung_id: b.id }))}
                        buildings={gedung}
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
