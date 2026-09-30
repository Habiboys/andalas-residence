import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Pen, Power, Trash2 } from 'lucide-react';
import { store, update, activate, destroy } from '@/routes/admin/penandatangan';
import {
    Badge,
    Button,
    DataTable,
    PageHeader,
    inputClass,
} from '../../components/ui';
import { Modal } from '../../components/atoms/Modal';

type Signer = {
    id: number;
    nama: string;
    nip: string | null;
    jabatan: string;
    unit: string;
    aktif: boolean;
};

const emptyForm = { nama: '', nip: '', jabatan: '', unit: '' };

export default function KelolaPenandatangan({
    signers = [],
}: {
    signers?: Signer[];
}) {
    const form = useForm(emptyForm);
    const [editing, setEditing] = useState<Signer | null>(null);
    const [formOpen, setFormOpen] = useState(false);

    const openCreate = () => {
        setEditing(null);
        form.reset();
        form.clearErrors();
        setFormOpen(true);
    };

    const openEdit = (signer: Signer) => {
        setEditing(signer);
        form.setData({
            nama: signer.nama,
            nip: signer.nip ?? '',
            jabatan: signer.jabatan,
            unit: signer.unit,
        });
        form.clearErrors();
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditing(null);
        form.reset();
        form.clearErrors();
    };

    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: closeForm };
        if (editing) {
            form.put(update.url({ signer: editing.id }), options);
        } else {
            form.post(store.url(), options);
        }
    };

    const columns = [
        {
            key: 'nama',
            label: 'Nama',
            render: (row: Signer) => (
                <span className="font-medium">{row.nama}</span>
            ),
        },
        { key: 'nip', label: 'NIP' },
        { key: 'jabatan', label: 'Jabatan' },
        { key: 'unit', label: 'Unit' },
        {
            key: 'aktif',
            label: 'Status',
            render: (row: Signer) => (
                <Badge color={row.aktif ? 'green' : 'gray'}>
                    {row.aktif ? 'Aktif' : 'Cadangan'}
                </Badge>
            ),
        },
        {
            key: 'aksi',
            label: 'Aksi',
            action: true,
            render: (row: Signer) => (
                <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(row)}
                        aria-label={`Ubah ${row.nama}`}
                    >
                        <Pen className="size-4" />
                        Ubah
                    </Button>
                    {!row.aktif && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                                form.post(activate.url({ signer: row.id }), {
                                    preserveScroll: true,
                                })
                            }
                        >
                            <Power className="size-4" />
                            Aktifkan
                        </Button>
                    )}
                    {!row.aktif && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                                form.delete(destroy.url({ signer: row.id }), {
                                    preserveScroll: true,
                                })
                            }
                        >
                            <Trash2 className="text-error size-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <PageHeader
                title="Kelola Penandatangan"
                subtitle="Penandatangan aktif dipakai pada surat yang terbit berikutnya. Surat yang sudah terbit tetap memakai nama dan NIP saat dicetak."
                actions={
                    <Button onClick={openCreate}>Tambah penandatangan</Button>
                }
            />
            <DataTable
                columns={columns}
                data={signers}
                emptyMessage="Belum ada penandatangan"
            />

            <Modal
                open={formOpen}
                onClose={closeForm}
                title={editing ? 'Ubah penandatangan' : 'Tambah penandatangan'}
                width="max-w-xl"
            >
                <form className="space-y-4" onSubmit={save}>
                    <label className="block space-y-1 text-sm">
                        <span>Nama lengkap dan gelar</span>
                        <input
                            className={inputClass}
                            value={form.data.nama}
                            onChange={(event) =>
                                form.setData('nama', event.target.value)
                            }
                            required
                        />
                        {form.errors.nama && (
                            <span className="text-error text-xs">
                                {form.errors.nama}
                            </span>
                        )}
                    </label>
                    <label className="block space-y-1 text-sm">
                        <span>NIP</span>
                        <input
                            className={inputClass}
                            value={form.data.nip}
                            onChange={(event) =>
                                form.setData('nip', event.target.value)
                            }
                        />
                        {form.errors.nip && (
                            <span className="text-error text-xs">
                                {form.errors.nip}
                            </span>
                        )}
                    </label>
                    <label className="block space-y-1 text-sm">
                        <span>Jabatan</span>
                        <input
                            className={inputClass}
                            value={form.data.jabatan}
                            onChange={(event) =>
                                form.setData('jabatan', event.target.value)
                            }
                            required
                        />
                        {form.errors.jabatan && (
                            <span className="text-error text-xs">
                                {form.errors.jabatan}
                            </span>
                        )}
                    </label>
                    <label className="block space-y-1 text-sm">
                        <span>Unit</span>
                        <input
                            className={inputClass}
                            value={form.data.unit}
                            onChange={(event) =>
                                form.setData('unit', event.target.value)
                            }
                            required
                        />
                        {form.errors.unit && (
                            <span className="text-error text-xs">
                                {form.errors.unit}
                            </span>
                        )}
                    </label>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={closeForm}
                            disabled={form.processing}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing
                                ? 'Menyimpan...'
                                : 'Simpan & aktifkan'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
