import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Pen, Power, Trash2, X } from 'lucide-react';
import { store, update, activate, destroy } from '@/routes/admin/penandatangan';
import {
    Badge,
    Button,
    Card,
    DataTable,
    PageHeader,
    inputClass,
} from '../../components/ui';

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
    const createForm = useForm(emptyForm);
    const editForm = useForm({ ...emptyForm, id: 0 });
    const [editing, setEditing] = useState<number | null>(null);

    const openEdit = (signer: Signer) => {
        setEditing(signer.id);
        editForm.setData({
            id: signer.id,
            nama: signer.nama,
            nip: signer.nip ?? '',
            jabatan: signer.jabatan,
            unit: signer.unit,
        });
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
                    {editing === row.id ? (
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                                setEditing(null);
                                editForm.reset();
                            }}
                        >
                            <X className="size-4" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(row)}
                        >
                            <Pen className="size-4" />
                            Ubah
                        </Button>
                    )}
                    {!row.aktif && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                                editForm.post(
                                    activate.url({ signer: row.id }),
                                    {
                                        preserveScroll: true,
                                    },
                                )
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
                                editForm.delete(destroy.url({ signer: row.id }), {
                                    preserveScroll: true,
                                })
                            }
                        >
                            <Trash2 className="size-4 text-error" />
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
            />

            <Card className="space-y-4 p-5">
                <h2 className="font-semibold">Tambah penandatangan</h2>
                <form
                    className="grid gap-4 sm:grid-cols-2"
                    onSubmit={(event) => {
                        event.preventDefault();
                        createForm.post(store.url(), {
                            preserveScroll: true,
                            onSuccess: () => createForm.reset(),
                        });
                    }}
                >
                    <label>
                        Nama lengkap dan gelar
                        <input
                            className={inputClass}
                            value={createForm.data.nama}
                            onChange={(e) =>
                                createForm.setData('nama', e.target.value)
                            }
                            required
                        />
                    </label>
                    <label>
                        NIP
                        <input
                            className={inputClass}
                            value={createForm.data.nip}
                            onChange={(e) =>
                                createForm.setData('nip', e.target.value)
                            }
                        />
                    </label>
                    <label>
                        Jabatan
                        <input
                            className={inputClass}
                            value={createForm.data.jabatan}
                            onChange={(e) =>
                                createForm.setData('jabatan', e.target.value)
                            }
                            required
                        />
                    </label>
                    <label>
                        Unit
                        <input
                            className={inputClass}
                            value={createForm.data.unit}
                            onChange={(e) =>
                                createForm.setData('unit', e.target.value)
                            }
                            required
                        />
                    </label>
                    <div className="sm:col-span-2">
                        <Button type="submit" disabled={createForm.processing}>
                            Simpan penandatangan
                        </Button>
                    </div>
                </form>
            </Card>

            {editing !== null && (
                <Card className="space-y-4 p-5">
                    <h2 className="font-semibold">Ubah penandatangan</h2>
                    <form
                        className="grid gap-4 sm:grid-cols-2"
                        onSubmit={(event) => {
                            event.preventDefault();
                            editForm.put(update.url({ signer: editForm.data.id }), {
                                preserveScroll: true,
                                onSuccess: () => {
                                    setEditing(null);
                                    editForm.reset();
                                },
                            });
                        }}
                    >
                        <label>
                            Nama lengkap dan gelar
                            <input
                                className={inputClass}
                                value={editForm.data.nama}
                                onChange={(e) =>
                                    editForm.setData('nama', e.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            NIP
                            <input
                                className={inputClass}
                                value={editForm.data.nip}
                                onChange={(e) =>
                                    editForm.setData('nip', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Jabatan
                            <input
                                className={inputClass}
                                value={editForm.data.jabatan}
                                onChange={(e) =>
                                    editForm.setData('jabatan', e.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Unit
                            <input
                                className={inputClass}
                                value={editForm.data.unit}
                                onChange={(e) =>
                                    editForm.setData('unit', e.target.value)
                                }
                                required
                            />
                        </label>
                        <div className="sm:col-span-2">
                            <Button type="submit" disabled={editForm.processing}>
                                Simpan perubahan
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <Card className="p-0">
                <DataTable
                    columns={columns}
                    data={signers}
                    emptyMessage="Belum ada penandatangan"
                />
            </Card>
        </div>
    );
}
