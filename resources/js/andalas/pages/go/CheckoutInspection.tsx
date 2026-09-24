import { useForm } from '@inertiajs/react';
import { update } from '@/routes/andalas/checkout/inspection';
import {
    Button,
    Card,
    FormField,
    inputClass,
    PageHeader,
    StatusBadge,
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

function Inspection({ row }: { row: Row }) {
    const room = row.placement?.kamar;
    const form = useForm({
        status: 'selesai',
        catatan: row.inspection?.catatan ?? '',
        asset_checks: (room?.aset ?? []).map((asset) => ({
            aset_id: asset.id,
            actual_quantity: asset.jumlah ?? 1,
            condition: 'baik',
            note: '',
        })),
    });
    const done =
        row.inspection?.status === 'selesai' || row.status === 'selesai';

    const updateCheck = (
        index: number,
        key: 'actual_quantity' | 'condition' | 'note',
        value: number | string,
    ) => {
        form.setData(
            'asset_checks',
            form.data.asset_checks.map((item, position) =>
                position === index ? { ...item, [key]: value } : item,
            ),
        );
    };

    return (
        <Card className="space-y-4 p-5">
            <div className="flex justify-between gap-3">
                <div>
                    <strong>{row.mahasiswa?.user?.nama}</strong>
                    <p className="text-muted mt-1 text-sm">
                        {room?.lantai?.gedung?.nama_gedung} / Kamar{' '}
                        {room?.nomor_kamar}
                    </p>
                </div>
                <StatusBadge status={row.inspection?.status ?? 'menunggu'} />
            </div>

            {done ? (
                <div className="space-y-3">
                    <p>{row.inspection?.catatan ?? 'Pemeriksaan selesai.'}</p>
                    {(row.inspection?.asset_checks ?? []).map((check) => (
                        <div
                            key={check.aset_id}
                            className="border-base-300 flex flex-wrap justify-between gap-2 border-t pt-3 text-sm"
                        >
                            <span>{check.name}</span>
                            <span>
                                Fisik {check.actual_quantity} / tercatat{' '}
                                {check.expected_quantity} · {check.condition}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.put(update.url({ checkoutRequest: row.id }));
                    }}
                >
                    <FormField label="Catatan pemeriksaan">
                        <textarea
                            required
                            className={inputClass}
                            value={form.data.catatan}
                            onChange={(event) =>
                                form.setData('catatan', event.target.value)
                            }
                        />
                    </FormField>

                    <div className="space-y-3">
                        <h3 className="font-medium">Hitung aset kamar</h3>
                        {(room?.aset ?? []).length === 0 && (
                            <p className="text-muted text-sm">
                                Tidak ada aset yang tercatat di kamar ini.
                            </p>
                        )}
                        {(room?.aset ?? []).map((asset, index) => {
                            const check = form.data.asset_checks[index];

                            return (
                                <div
                                    key={asset.id}
                                    className="border-base-300 grid gap-3 border-t pt-3 md:grid-cols-[minmax(0,1fr)_8rem_11rem]"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {asset.nama_aset}
                                        </p>
                                        <p className="text-muted text-sm">
                                            {asset.kode_inventaris} · tercatat{' '}
                                            {asset.jumlah ?? 1}
                                        </p>
                                    </div>
                                    <FormField label="Jumlah fisik">
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            max={asset.jumlah ?? 1}
                                            className={inputClass}
                                            value={check.actual_quantity}
                                            onChange={(event) =>
                                                updateCheck(
                                                    index,
                                                    'actual_quantity',
                                                    Number(event.target.value),
                                                )
                                            }
                                        />
                                    </FormField>
                                    <FormField label="Kondisi">
                                        <select
                                            className={inputClass}
                                            value={check.condition}
                                            onChange={(event) =>
                                                updateCheck(
                                                    index,
                                                    'condition',
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            <option value="baik">Baik</option>
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
                                    {(check.actual_quantity <
                                        (asset.jumlah ?? 1) ||
                                        check.condition !== 'baik') && (
                                        <div className="md:col-span-3">
                                            <FormField label="Catatan temuan">
                                                <textarea
                                                    required
                                                    className={inputClass}
                                                    placeholder="Jelaskan kerusakan atau selisih jumlah"
                                                    value={check.note}
                                                    onChange={(event) =>
                                                        updateCheck(
                                                            index,
                                                            'note',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </FormField>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {Object.entries(form.errors).map(([key, error]) => (
                        <p key={key} className="text-error text-sm">
                            {String(error)}
                        </p>
                    ))}
                    <Button type="submit" disabled={form.processing}>
                        {form.processing
                            ? 'Menyimpan…'
                            : 'Selesaikan pemeriksaan'}
                    </Button>
                </form>
            )}
        </Card>
    );
}

export default function CheckoutInspection({
    checkout = [],
}: {
    checkout?: Row[];
}) {
    return (
        <div className="space-y-4">
            <PageHeader
                title="Inspeksi Check-out"
                subtitle="Hitung aset dan catat kondisinya. Selisih atau kerusakan otomatis menjadi tiket teknisi."
            />
            {checkout.map((row) => (
                <Inspection key={row.id} row={row} />
            ))}
        </div>
    );
}
