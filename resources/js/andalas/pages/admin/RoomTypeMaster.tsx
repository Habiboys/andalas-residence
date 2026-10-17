import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { store, update } from '@/routes/admin/master-data/tipe-kamar';
import {
    useRoomTypeCatalog,
    type RoomTypeOption,
} from '@/andalas/lib/room-types';
import {
    PageHeader,
    Button,
    IconButton,
    DataTable,
    Modal,
    FormField,
    inputClass,
} from '../../components/ui';

export default function RoomTypeMaster() {
    const catalog = useRoomTypeCatalog();
    const [target, setTarget] = useState<RoomTypeOption | 'new' | null>(null);
    const form = useForm({ code: '', name: '', active: true });
    function open(type: RoomTypeOption | 'new') {
        form.clearErrors();
        form.setData(
            type === 'new'
                ? { code: '', name: '', active: true }
                : { code: type.code, name: type.name, active: type.active },
        );
        setTarget(type);
    }
    return (
        <div className="space-y-4">
            <PageHeader
                title="Master Tipe Kamar"
                subtitle="Kelola jenis kamar untuk seluruh gedung. Kapasitas, fasilitas, dan tarif diatur pada masing-masing gedung."
            />
            <DataTable
                data={catalog}
                searchKeys={['code', 'name']}
                emptyMessage="Belum ada tipe kamar. Tambahkan tipe pertama."
                actions={
                    <Button onClick={() => open('new')}>
                        Tambah tipe kamar
                    </Button>
                }
                columns={[
                    {
                        key: 'name',
                        label: 'Nama tipe',
                        render: (type) => (
                            <span className="font-semibold">{type.name}</span>
                        ),
                    },
                    { key: 'code', label: 'Kode' },
                    {
                        key: 'active',
                        label: 'Status',
                        render: (type) => (type.active ? 'Aktif' : 'Nonaktif'),
                    },
                    {
                        key: 'actions',
                        label: 'Aksi',
                        render: (type) => (
                            <IconButton
                                label={`Edit ${type.name}`}
                                icon={Pencil}
                                onClick={() => open(type)}
                            />
                        ),
                    },
                ]}
            />
            <Modal
                open={target !== null}
                onClose={() => setTarget(null)}
                title={
                    target === 'new' ? 'Tambah tipe kamar' : 'Edit tipe kamar'
                }
            >
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        const options = {
                            preserveScroll: true,
                            onSuccess: () => setTarget(null),
                        };
                        if (target === 'new') {
                            form.transform((data) => data);
                            form.post(store.url(), options);
                        } else if (target) {
                            form.transform(({ name, active }) => ({
                                name,
                                active,
                            }));
                            form.put(update.url(target.id), options);
                        }
                    }}
                >
                    {target === 'new' ? (
                        <FormField
                            label="Kode tipe"
                            hint="Huruf kecil, angka, atau garis bawah. Kode tetap setelah disimpan."
                        >
                            <input
                                className={inputClass}
                                value={form.data.code}
                                onChange={(event) =>
                                    form.setData('code', event.target.value)
                                }
                                required
                                maxLength={50}
                                pattern="[a-z][a-z0-9_]*"
                            />
                        </FormField>
                    ) : (
                        <p className="text-muted text-sm">
                            Kode: {form.data.code}
                        </p>
                    )}
                    {form.errors.code && (
                        <p role="alert" className="text-error text-sm">
                            {form.errors.code}
                        </p>
                    )}
                    <FormField label="Nama tipe">
                        <input
                            className={inputClass}
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            required
                            maxLength={100}
                        />
                    </FormField>
                    {form.errors.name && (
                        <p role="alert" className="text-error text-sm">
                            {form.errors.name}
                        </p>
                    )}
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.data.active}
                            onChange={(event) =>
                                form.setData('active', event.target.checked)
                            }
                        />
                        Tipe aktif
                    </label>
                    {form.errors.active && (
                        <p className="text-error text-sm">
                            {form.errors.active}
                        </p>
                    )}
                    <p className="text-muted text-sm">
                        Menonaktifkan tipe menghentikan pilihan baru. Riwayat
                        kamar dan tarif tetap tersimpan.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={() => setTarget(null)}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
