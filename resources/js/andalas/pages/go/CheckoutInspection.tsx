import { useState, type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import { ClipboardCheck, Eye } from 'lucide-react';
import { update } from '@/routes/andalas/checkout/inspection';
import {
    Button,
    DataTable,
    Drawer,
    FormField,
    IconButton,
    inputClass,
    PageHeader,
    StatusBadge,
    type DataColumn,
} from '../../components/ui';

type Asset = {
    id: string;
    nama_aset: string;
    kode_inventaris: string;
    jumlah: number;
};

type AssetCheck = {
    aset_id: string;
    actual_quantity: number;
    condition: string;
    note: string;
    expected_quantity?: number;
    name?: string;
};

type Row = {
    id: string;
    status: string;
    mahasiswa?: { user?: { nama: string } };
    placement?: {
        kamar?: {
            nomor_kamar: string;
            aset?: Asset[];
            lantai?: { gedung?: { nama_gedung: string } };
        };
    };
    inspection?: {
        status: string;
        catatan?: string;
        asset_checks?: AssetCheck[];
    };
};

type TableRow = Row & {
    mahasiswa_nama: string;
    lokasi: string;
    status_inspeksi: string;
};

export default function CheckoutInspection({
    checkout = [],
}: {
    checkout?: Row[];
}) {
    const [selected, setSelected] = useState<TableRow | null>(null);
    const form = useForm({
        status: 'selesai',
        catatan: '',
        asset_checks: [] as AssetCheck[],
    });
    const rows: TableRow[] = checkout.map((row) => {
        const selectedRoom = row.placement?.kamar;
        const building = selectedRoom?.lantai?.gedung?.nama_gedung;

        return {
            ...row,
            mahasiswa_nama: row.mahasiswa?.user?.nama ?? '-',
            lokasi: [
                building,
                selectedRoom?.nomor_kamar &&
                    `Kamar ${selectedRoom.nomor_kamar}`,
            ]
                .filter(Boolean)
                .join(' / '),
            status_inspeksi: row.inspection?.status ?? 'menunggu',
        };
    });
    const room = selected?.placement?.kamar;
    const done =
        selected?.inspection?.status === 'selesai' ||
        selected?.status === 'selesai';

    function openInspection(row: TableRow) {
        const selectedRoom = row.placement?.kamar;
        form.clearErrors();
        form.setData({
            status: 'selesai',
            catatan: row.inspection?.catatan ?? '',
            asset_checks: (selectedRoom?.aset ?? []).map((asset) => ({
                aset_id: asset.id,
                actual_quantity: asset.jumlah ?? 1,
                condition: 'baik',
                note: '',
            })),
        });
        setSelected(row);
    }

    function closeInspection() {
        setSelected(null);
        form.clearErrors();
    }

    function updateCheck(
        index: number,
        key: 'actual_quantity' | 'condition' | 'note',
        value: number | string,
    ) {
        form.setData(
            'asset_checks',
            form.data.asset_checks.map((item, position) =>
                position === index ? { ...item, [key]: value } : item,
            ),
        );
    }

    function submitInspection(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!selected) {
            return;
        }

        form.put(update.url({ checkoutRequest: selected.id }), {
            onSuccess: closeInspection,
        });
    }

    const columns: DataColumn<TableRow>[] = [
        { key: 'mahasiswa_nama', label: 'Mahasiswa' },
        { key: 'lokasi', label: 'Gedung / kamar' },
        {
            key: 'status_inspeksi',
            label: 'Status inspeksi',
            render: (row) => <StatusBadge status={row.status_inspeksi} />,
            filter: {
                type: 'select',
                options: ['menunggu', 'selesai'],
            },
        },
        {
            key: 'status',
            label: 'Status checkout',
            render: (row) => <StatusBadge status={row.status} />,
        },
        {
            key: 'aksi',
            label: 'Aksi',
            action: true,
            render: (row) => {
                const isDone =
                    row.inspection?.status === 'selesai' ||
                    row.status === 'selesai';

                return (
                    <IconButton
                        label={
                            isDone ? 'Lihat hasil inspeksi' : 'Periksa kamar'
                        }
                        icon={isDone ? Eye : ClipboardCheck}
                        tone={
                            isDone
                                ? 'text-info hover:bg-info/10'
                                : 'text-primary hover:bg-primary/10'
                        }
                        onClick={() => openInspection(row)}
                    />
                );
            },
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Inspeksi Check-out"
                subtitle="Hitung aset dan catat kondisinya. Selisih atau kerusakan otomatis menjadi tiket teknisi."
            />

            <DataTable
                columns={columns}
                data={rows}
                searchKeys={[
                    'mahasiswa_nama',
                    'lokasi',
                    'status_inspeksi',
                    'status',
                ]}
                searchPlaceholder="Cari mahasiswa, kamar, atau status..."
                emptyMessage="Belum ada pengajuan checkout untuk diperiksa."
            />

            <Drawer
                open={selected !== null}
                onClose={closeInspection}
                title={done ? 'Hasil inspeksi kamar' : 'Inspeksi kamar'}
                footer={
                    !done ? (
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={closeInspection}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                form="inspection-form"
                                disabled={form.processing}
                            >
                                {form.processing
                                    ? 'Menyimpan...'
                                    : 'Selesaikan pemeriksaan'}
                            </Button>
                        </div>
                    ) : undefined
                }
            >
                {selected && (
                    <div className="space-y-5">
                        <div className="space-y-1 text-sm">
                            <p className="font-semibold">
                                {selected.mahasiswa_nama}
                            </p>
                            <p className="text-muted">{selected.lokasi}</p>
                            <StatusBadge status={selected.status_inspeksi} />
                        </div>

                        {done ? (
                            <div className="space-y-3">
                                <p>
                                    {selected.inspection?.catatan ??
                                        'Pemeriksaan selesai.'}
                                </p>
                                {(selected.inspection?.asset_checks ?? []).map(
                                    (check) => (
                                        <div
                                            key={check.aset_id}
                                            className="border-base-300 flex flex-wrap justify-between gap-2 border-t pt-3 text-sm"
                                        >
                                            <span>{check.name}</span>
                                            <span>
                                                Fisik {check.actual_quantity} /
                                                tercatat{' '}
                                                {check.expected_quantity}{' '}
                                                &middot; {check.condition}
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        ) : (
                            <form
                                id="inspection-form"
                                className="space-y-5"
                                onSubmit={submitInspection}
                            >
                                <FormField label="Catatan pemeriksaan">
                                    <textarea
                                        required
                                        className={inputClass}
                                        value={form.data.catatan}
                                        onChange={(event) =>
                                            form.setData(
                                                'catatan',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>

                                <section className="space-y-3">
                                    <h3 className="font-medium">
                                        Hitung aset kamar
                                    </h3>
                                    {(room?.aset ?? []).length === 0 && (
                                        <p className="text-muted text-sm">
                                            Tidak ada aset yang tercatat di
                                            kamar ini.
                                        </p>
                                    )}
                                    {(room?.aset ?? []).map((asset, index) => {
                                        const check =
                                            form.data.asset_checks[index];

                                        if (!check) {
                                            return null;
                                        }

                                        return (
                                            <div
                                                key={asset.id}
                                                className="border-base-300 grid gap-3 border-t pt-3"
                                            >
                                                <div>
                                                    <p className="font-medium">
                                                        {asset.nama_aset}
                                                    </p>
                                                    <p className="text-muted text-sm">
                                                        {asset.kode_inventaris}{' '}
                                                        &middot; tercatat{' '}
                                                        {asset.jumlah ?? 1}
                                                    </p>
                                                </div>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <FormField label="Jumlah fisik">
                                                        <input
                                                            required
                                                            type="number"
                                                            min={0}
                                                            max={
                                                                asset.jumlah ??
                                                                1
                                                            }
                                                            className={
                                                                inputClass
                                                            }
                                                            value={
                                                                check.actual_quantity
                                                            }
                                                            onChange={(event) =>
                                                                updateCheck(
                                                                    index,
                                                                    'actual_quantity',
                                                                    Number(
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    ),
                                                                )
                                                            }
                                                        />
                                                    </FormField>
                                                    <FormField label="Kondisi">
                                                        <select
                                                            className={
                                                                inputClass
                                                            }
                                                            value={
                                                                check.condition
                                                            }
                                                            onChange={(event) =>
                                                                updateCheck(
                                                                    index,
                                                                    'condition',
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                        >
                                                            <option value="baik">
                                                                Baik
                                                            </option>
                                                            <option value="rusak_ringan">
                                                                Rusak ringan
                                                            </option>
                                                            <option value="rusak_berat">
                                                                Rusak berat
                                                            </option>
                                                            <option value="hilang">
                                                                Hilang
                                                            </option>
                                                        </select>
                                                    </FormField>
                                                </div>
                                                {(check.actual_quantity <
                                                    (asset.jumlah ?? 1) ||
                                                    check.condition !==
                                                        'baik') && (
                                                    <FormField label="Catatan temuan">
                                                        <textarea
                                                            required
                                                            className={
                                                                inputClass
                                                            }
                                                            placeholder="Jelaskan kerusakan atau selisih jumlah"
                                                            value={check.note}
                                                            onChange={(event) =>
                                                                updateCheck(
                                                                    index,
                                                                    'note',
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    </FormField>
                                                )}
                                            </div>
                                        );
                                    })}
                                </section>

                                {Object.entries(form.errors).map(
                                    ([key, error]) => (
                                        <p
                                            key={key}
                                            className="text-error text-sm"
                                        >
                                            {String(error)}
                                        </p>
                                    ),
                                )}
                            </form>
                        )}
                    </div>
                )}
            </Drawer>
        </div>
    );
}
