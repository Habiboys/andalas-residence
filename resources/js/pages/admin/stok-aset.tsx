import { useState, type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Card,
    PageHeader,
    DataTable,
    Button,
    FormField,
    inputClass,
    Drawer,
    RowActions,
    ConfirmDialog,
} from '@/andalas/components/ui';
import { store, update, destroy } from '@/routes/andalas/stok-aset';

type Stock = {
    id: string;
    kode: string;
    nama: string;
    kategori: string;
    satuan: string;
    jumlah_total: number;
    jumlah_ditempatkan: number | null;
};
const empty = {
    kode: '',
    nama: '',
    kategori: '',
    satuan: 'unit',
    jumlah_total: 0,
};
export default function StokAset({ stok = [] }: { stok?: Stock[] }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Stock | null>(null);
    const [deleting, setDeleting] = useState<Stock | null>(null);
    const form = useForm(empty);
    const deletion = useForm({});
    function edit(row: Stock | null) {
        setEditing(row);
        form.resetAndClearErrors();
        form.setData(
            row
                ? {
                      kode: row.kode,
                      nama: row.nama,
                      kategori: row.kategori,
                      satuan: row.satuan,
                      jumlah_total: row.jumlah_total,
                  }
                : empty,
        );
        setOpen(true);
    }
    function save(event: FormEvent) {
        event.preventDefault();
        const options = { onSuccess: () => setOpen(false) };
        if (editing) form.put(update.url(editing.id), options);
        else form.post(store.url(), options);
    }
    return (
        <div className="space-y-5">
            <PageHeader
                title="Stok Aset Keseluruhan"
                subtitle="Jumlah keseluruhan mencakup stok tersedia dan aset yang sudah ditempatkan di kamar atau fasilitas."
                actions={
                    <Button onClick={() => edit(null)}>
                        Tambah jenis stok
                    </Button>
                }
            />
            <Card>
                <DataTable
                    data={stok}
                    searchKeys={['kode', 'nama', 'kategori']}
                    columns={[
                        { key: 'kode', label: 'Kode stok' },
                        { key: 'nama', label: 'Jenis aset' },
                        {
                            key: 'kategori',
                            label: 'Kategori',
                            filter: {
                                type: 'select',
                                options: [
                                    ...new Set(stok.map((row) => row.kategori)),
                                ],
                            },
                        },
                        { key: 'jumlah_total', label: 'Jumlah keseluruhan' },
                        {
                            key: 'jumlah_ditempatkan',
                            label: 'Ditempatkan',
                            value: (row) => Number(row.jumlah_ditempatkan ?? 0),
                        },
                        {
                            key: 'tersedia',
                            label: 'Tersedia',
                            value: (row) =>
                                row.jumlah_total -
                                Number(row.jumlah_ditempatkan ?? 0),
                        },
                        { key: 'satuan', label: 'Satuan' },
                        {
                            key: 'actions',
                            label: 'Aksi',
                            action: true,
                            render: (row) => (
                                <RowActions
                                    onEdit={() => edit(row)}
                                    onDelete={() => {
                                        deletion.clearErrors();
                                        setDeleting(row);
                                    }}
                                />
                            ),
                        },
                    ]}
                />
            </Card>
            {Object.values(deletion.errors).map((error, index) => (
                <p key={index} role="alert" className="text-error text-sm">
                    {String(error)}
                </p>
            ))}
            <Drawer
                open={open}
                onClose={() => setOpen(false)}
                title={editing ? 'Edit stok aset' : 'Tambah jenis stok'}
            >
                <form onSubmit={save} className="space-y-4">
                    {(['kode', 'nama', 'kategori', 'satuan'] as const).map(
                        (field) => (
                            <FormField
                                key={field}
                                label={
                                    {
                                        kode: 'Kode stok',
                                        nama: 'Nama jenis aset',
                                        kategori: 'Kategori',
                                        satuan: 'Satuan',
                                    }[field]
                                }
                            >
                                <input
                                    required
                                    className={inputClass}
                                    value={form.data[field]}
                                    onChange={(event) =>
                                        form.setData(field, event.target.value)
                                    }
                                />
                            </FormField>
                        ),
                    )}
                    <FormField label="Jumlah keseluruhan">
                        <input
                            required
                            type="number"
                            min={Number(editing?.jumlah_ditempatkan ?? 0)}
                            step={1}
                            className={inputClass}
                            value={form.data.jumlah_total}
                            onChange={(event) =>
                                form.setData(
                                    'jumlah_total',
                                    Number(event.target.value),
                                )
                            }
                        />
                    </FormField>
                    {Object.values(form.errors).map((error) => (
                        <p key={error} className="text-error text-sm">
                            {error}
                        </p>
                    ))}
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Menyimpan…' : 'Simpan'}
                    </Button>
                </form>
            </Drawer>
            <ConfirmDialog
                open={!!deleting}
                onClose={() => setDeleting(null)}
                title="Hapus stok aset"
                message={`Hapus jenis stok ${deleting?.nama ?? ''}? Jenis yang masih ditempatkan tidak dapat dihapus.`}
                loading={deletion.processing}
                onConfirm={() => {
                    if (deleting)
                        deletion.delete(destroy.url(deleting.id), {
                            onSuccess: () => setDeleting(null),
                            onError: () => setDeleting(null),
                        });
                }}
            />
        </div>
    );
}
