import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    Table,
    Button,
    Drawer,
    FormField,
    inputClass,
    ConfirmDialog,
    RowActions,
} from '../../components/ui';
import {
    store as kegiatanStore,
    update as kegiatanUpdate,
    destroy as kegiatanDestroy,
} from '@/routes/andalas/kegiatan';

type KegiatanRow = {
    id: string;
    judul?: string;
    tanggal_mulai?: string;
    tanggal_selesai?: string;
    lokasi?: string;
    deskripsi?: string;
    gedung_id?: string | null;
    gedung?: { nama_gedung: string } | null;
    can_manage?: boolean;
    attendance_sessions_count?: number;
};

type Props = {
    kegiatan: KegiatanRow[];
    gedung?: Array<{ id: string; nama_gedung: string }>;
};

const emptyForm = {
    judul: '',
    deskripsi: '',
    lokasi: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
    gedung_id: '',
};

export default function AdminJadwalKegiatan({ kegiatan, gedung = [] }: Props) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<KegiatanRow | null>(null);
    const [deleting, setDeleting] = useState<KegiatanRow | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);
    const {
        data,
        setData,
        post,
        put,
        errors,
        processing,
        resetAndClearErrors,
        clearErrors,
    } = useForm(emptyForm);

    function openCreate() {
        setEditing(null);
        resetAndClearErrors();
        setOpen(true);
    }

    function openEdit(row: KegiatanRow) {
        setEditing(row);
        setData({
            judul: row.judul ?? '',
            deskripsi: row.deskripsi ?? '',
            gedung_id: row.gedung_id ?? '',
            lokasi: row.lokasi ?? '',
            tanggal_mulai: localDateTime(row.tanggal_mulai),
            tanggal_selesai: localDateTime(row.tanggal_selesai),
        });
        clearErrors();
        setOpen(true);
    }

    function save(e: React.FormEvent) {
        e.preventDefault();
        if (editing) {
            put(kegiatanUpdate.url({ id: editing.id }), {
                onSuccess: () => setOpen(false),
            });
        } else {
            post(kegiatanStore.url(), { onSuccess: () => setOpen(false) });
        }
    }

    function confirmDelete() {
        if (!deleting) return;
        setDeletingBusy(true);
        router.delete(kegiatanDestroy.url({ id: deleting.id }), {
            onSuccess: () => setDeleting(null),
            onFinish: () => setDeletingBusy(false),
        });
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title="Jadwal Kegiatan"
                subtitle="Kegiatan umum seluruh asrama dan kegiatan khusus gedung."
                actions={<Button onClick={openCreate}>Tambah Kegiatan</Button>}
            />
            <Card>
                <Table
                    columns={[
                        { key: 'judul', label: 'Judul' },
                        {
                            key: 'tanggal_mulai',
                            label: 'Mulai',
                            render: (r: KegiatanRow) =>
                                localDateTime(r.tanggal_mulai).replace(
                                    'T',
                                    ' ',
                                ),
                        },
                        {
                            key: 'cakupan',
                            label: 'Cakupan',
                            filter: {
                                type: 'select',
                                options: [
                                    'Umum - seluruh asrama',
                                    ...gedung.map((item) => item.nama_gedung),
                                ],
                            },
                        },
                        { key: 'lokasi', label: 'Lokasi' },
                        {
                            key: 'aksi',
                            label: '',
                            render: (r: KegiatanRow) =>
                                r.can_manage ? (
                                    <RowActions
                                        onEdit={() => openEdit(r)}
                                        onDelete={
                                            r.attendance_sessions_count
                                                ? undefined
                                                : () => setDeleting(r)
                                        }
                                    />
                                ) : (
                                    <span className="text-muted text-xs">
                                        Dikelola pembuat
                                    </span>
                                ),
                        },
                    ]}
                    data={(kegiatan ?? []).map((item) => ({
                        ...item,
                        cakupan:
                            item.gedung?.nama_gedung ?? 'Umum - seluruh asrama',
                    }))}
                    searchKeys={['judul', 'lokasi', 'cakupan']}
                    emptyMessage="Belum ada kegiatan"
                />
            </Card>

            <Drawer
                open={open}
                onClose={() => setOpen(false)}
                title={editing ? 'Edit Kegiatan' : 'Tambah Kegiatan'}
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
                            form="kegiatan-form"
                            disabled={processing}
                        >
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                }
            >
                <form id="kegiatan-form" onSubmit={save} className="space-y-3">
                    <FormField label="Judul">
                        <input
                            className={inputClass}
                            value={data.judul}
                            onChange={(e) => setData('judul', e.target.value)}
                            required
                        />
                    </FormField>
                    {errors.judul && (
                        <p className="text-error text-sm">{errors.judul}</p>
                    )}
                    <FormField label="Lokasi">
                        <input
                            className={inputClass}
                            value={data.lokasi}
                            onChange={(e) => setData('lokasi', e.target.value)}
                        />
                    </FormField>
                    <FormField label="Cakupan kegiatan">
                        <select
                            className={inputClass}
                            value={data.gedung_id}
                            onChange={(e) =>
                                setData('gedung_id', e.target.value)
                            }
                            disabled={!!editing?.attendance_sessions_count}
                        >
                            <option value="">Umum - seluruh asrama</option>
                            {gedung.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.nama_gedung}
                                </option>
                            ))}
                        </select>
                    </FormField>
                    <p className="text-muted text-xs">
                        Kegiatan khusus gedung hanya dapat diabsen penghuni
                        aktif gedung tersebut. Cakupan dikunci setelah sesi QR
                        pertama dibuat.
                    </p>
                    <FormField label="Mulai">
                        <input
                            type="datetime-local"
                            className={inputClass}
                            value={data.tanggal_mulai}
                            onChange={(e) =>
                                setData('tanggal_mulai', e.target.value)
                            }
                            required
                        />
                    </FormField>
                    <FormField label="Selesai">
                        <input
                            type="datetime-local"
                            className={inputClass}
                            value={data.tanggal_selesai}
                            onChange={(e) =>
                                setData('tanggal_selesai', e.target.value)
                            }
                            required
                        />
                    </FormField>
                    <FormField label="Deskripsi">
                        <textarea
                            className={inputClass}
                            rows={3}
                            value={data.deskripsi}
                            onChange={(e) =>
                                setData('deskripsi', e.target.value)
                            }
                        />
                    </FormField>
                    {Object.entries(errors)
                        .filter(([key]) => key !== 'judul')
                        .map(([key, message]) => (
                            <p key={key} className="text-error text-sm">
                                {message}
                            </p>
                        ))}
                </form>
            </Drawer>

            <ConfirmDialog
                open={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                loading={deletingBusy}
                title="Hapus Kegiatan"
                message={`Hapus kegiatan ${deleting?.judul ?? ''}? Tindakan ini tidak dapat dibatalkan.`}
            />
        </div>
    );
}

function localDateTime(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
}
