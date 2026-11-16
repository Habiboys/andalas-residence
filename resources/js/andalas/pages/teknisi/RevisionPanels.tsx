import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { MessageSquarePlus, Plus } from 'lucide-react';
import { Button, Card, Modal, inputClass } from '../../components/ui';
import { newDamageRequestKey } from '../../lib/damage-reports';

type ItemInput = {
    description: string;
    aset_id: string;
    location_label: string;
    photos: File[];
};
export type DamageItem = {
    id: string;
    description: string;
    location_label?: string;
    completed_at: string | null;
    completion_note?: string;
    photos: { id: string; type: string }[];
};
export type LogbookRow = {
    id: string;
    work_date: string;
    description: string;
    source: string;
    user?: { nama: string };
    photos: { id: string }[];
};
function ErrorList({ errors }: { errors: Record<string, string | undefined> }) {
    return (
        <>
            {Object.entries(errors).map(([k, v]) =>
                v ? (
                    <p key={k} role="alert" className="text-error text-sm">
                        {v}
                    </p>
                ) : null,
            )}
        </>
    );
}
const emptyItem = (): ItemInput => ({
    description: '',
    aset_id: '',
    location_label: '',
    photos: [],
});

export function MultiItemForm({
    name,
    room,
    assets,
    facilities,
}: {
    name: string;
    room?: {
        id?: string;
        nomor_kamar: string;
        lantai?: { gedung?: { nama_gedung: string } };
    } | null;
    assets: {
        id: string;
        nama_aset: string;
        kamar_id?: string | null;
        fasilitas_umum_id?: string | null;
    }[];
    facilities: { id: string; nama_fasilitas: string }[];
}) {
    const [open, setOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const form = useForm<{
        request_key: string;
        fasilitas_umum_id: string;
        items: ItemInput[];
    }>({
        request_key: newDamageRequestKey(),
        fasilitas_umum_id: '',
        items: [emptyItem()],
    });
    const filteredAssets = assets.filter((a) =>
        form.data.fasilitas_umum_id
            ? a.fasilitas_umum_id === form.data.fasilitas_umum_id
            : room?.id
              ? a.kamar_id === room.id
              : !a.fasilitas_umum_id,
    );
    const roomLocation = [
        room?.lantai?.gedung?.nama_gedung,
        room?.nomor_kamar ? `Kamar ${room.nomor_kamar}` : null,
    ]
        .filter(Boolean)
        .join(' · ');

    function edit(index: number, values: Partial<ItemInput>) {
        form.setData(
            'items',
            form.data.items.map((item, i) =>
                i === index ? { ...item, ...values } : item,
            ),
        );
    }

    function closeModal() {
        if (form.processing) {
            return;
        }
        setOpen(false);
        form.clearErrors();
    }

    return (
        <>
            <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                        <h2 className="text-base-content text-sm font-semibold">
                            Buat laporan / tambah item kamar
                        </h2>
                        <p className="text-muted text-xs md:text-sm">
                            Penghuni:{' '}
                            <strong className="text-base-content">
                                {name}
                            </strong>
                            {roomLocation ? ` · ${roomLocation}` : ''}
                        </p>
                    </div>
                    <Button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="shrink-0 gap-1.5"
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Buat laporan / tambah item kamar
                    </Button>
                </div>
            </Card>

            <Modal
                open={open}
                onClose={closeModal}
                title="Buat Laporan / Tambah Item Kamar"
                width="max-w-2xl"
            >
                <form
                    key={formKey}
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post('/andalas/laporan-kerusakan', {
                            forceFormData: true,
                            onSuccess: () => {
                                form.setData({
                                    request_key: newDamageRequestKey(),
                                    fasilitas_umum_id: '',
                                    items: [emptyItem()],
                                });
                                setFormKey((prev) => prev + 1);
                                setOpen(false);
                            },
                        });
                    }}
                >
                    <div className="border-base-300 bg-base-200/50 space-y-1 rounded-lg border p-3 text-sm">
                        <p>
                            Penghuni: <strong>{name}</strong>
                            {roomLocation ? ` · ${roomLocation}` : ''}
                        </p>
                        <p className="text-muted text-xs">
                            Item otomatis ditambahkan ke laporan kamar yang
                            masih Belum Dikerjakan. Bila pekerjaan sebelumnya
                            sudah dimulai, pengiriman ini menjadi laporan baru
                            tanpa mengubah pekerjaan lama.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-base-content block text-xs font-medium">
                            Lokasi laporan
                        </label>
                        <select
                            aria-label="Lokasi laporan"
                            className={inputClass}
                            value={form.data.fasilitas_umum_id}
                            onChange={(e) =>
                                form.setData({
                                    ...form.data,
                                    fasilitas_umum_id: e.target.value,
                                    items: [emptyItem()],
                                })
                            }
                        >
                            <option value="">Kamar saya</option>
                            {facilities.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.nama_fasilitas}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3">
                        {form.data.items.map((item, index) => (
                            <div
                                key={index}
                                className="border-base-300 bg-base-100 space-y-3 rounded-lg border p-4"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-semibold">
                                        Item {index + 1}
                                    </h3>
                                    {form.data.items.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-error hover:bg-error/10"
                                            onClick={() =>
                                                form.setData(
                                                    'items',
                                                    form.data.items.filter(
                                                        (_, i) => i !== index,
                                                    ),
                                                )
                                            }
                                        >
                                            Hapus item dari formulir
                                        </Button>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-base-content block text-xs font-medium">
                                        Aset inventaris
                                    </label>
                                    <select
                                        aria-label={`Aset item ${index + 1}`}
                                        className={inputClass}
                                        value={item.aset_id}
                                        onChange={(e) =>
                                            edit(index, {
                                                aset_id: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="">
                                            Tanpa inventaris
                                        </option>
                                        {filteredAssets.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.nama_aset}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-base-content block text-xs font-medium">
                                        Rincian lokasi
                                    </label>
                                    <input
                                        aria-label={`Lokasi item ${index + 1}`}
                                        className={inputClass}
                                        value={item.location_label}
                                        onChange={(e) =>
                                            edit(index, {
                                                location_label: e.target.value,
                                            })
                                        }
                                        placeholder="Rincian lokasi dalam kamar/fasilitas"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-base-content block text-xs font-medium">
                                        Deskripsi kerusakan{' '}
                                        <span className="text-error">*</span>
                                    </label>
                                    <textarea
                                        aria-label={`Deskripsi item ${index + 1}`}
                                        className={inputClass}
                                        rows={3}
                                        required
                                        value={item.description}
                                        onChange={(e) =>
                                            edit(index, {
                                                description: e.target.value,
                                            })
                                        }
                                        placeholder="Kerusakan item ini"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-base-content block text-xs font-medium">
                                        Foto awal item (opsional)
                                    </label>
                                    <input
                                        type="file"
                                        className="file-input file-input-sm w-full"
                                        multiple
                                        accept="image/jpeg,image/png"
                                        onChange={(e) =>
                                            edit(index, {
                                                photos: Array.from(
                                                    e.target.files ?? [],
                                                ),
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            disabled={form.data.items.length >= 30}
                            onClick={() =>
                                form.setData('items', [
                                    ...form.data.items,
                                    emptyItem(),
                                ])
                            }
                            className="gap-1.5"
                        >
                            <Plus className="size-3.5" aria-hidden="true" />
                            Tambah item lain
                        </Button>
                    </div>

                    <ErrorList errors={form.errors} />

                    <div className="border-base-200 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={form.processing}
                            onClick={closeModal}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing
                                ? 'Menyimpan...'
                                : 'Simpan item laporan'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

export function ItemCompletion({
    item,
    canComplete,
}: {
    item: DamageItem;
    canComplete: boolean;
}) {
    const form = useForm<{ note: string; photos: File[] }>({
        note: '',
        photos: [],
    });
    return (
        <Card className="space-y-2 p-3">
            <p>
                <strong>{item.description}</strong> /{' '}
                {item.completed_at ? 'Item selesai' : 'Item belum selesai'}
            </p>
            <p className="text-sm">
                {item.location_label} {item.completion_note}
            </p>
            <div className="flex gap-3">
                {item.photos.map((p) => (
                    <a
                        className="link"
                        key={p.id}
                        target="_blank"
                        rel="noreferrer"
                        href={`/andalas/tiket/foto/${p.id}`}
                    >
                        {p.type === 'after' ? 'Bukti item' : 'Foto awal item'}
                    </a>
                ))}
            </div>
            {canComplete && !item.completed_at && (
                <form
                    className="space-y-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(`/pelaporan/items/${item.id}/complete`, {
                            forceFormData: true,
                            preserveScroll: true,
                        });
                    }}
                >
                    <input
                        aria-label={`Hasil item ${item.description}`}
                        className={inputClass}
                        value={form.data.note}
                        required
                        onChange={(e) => form.setData('note', e.target.value)}
                        placeholder="Hasil perbaikan item"
                    />
                    <label className="block">
                        Bukti item (opsional; bukti final laporan tetap wajib)
                        <input
                            type="file"
                            className="file-input w-full"
                            multiple
                            accept="image/jpeg,image/png"
                            onChange={(e) =>
                                form.setData(
                                    'photos',
                                    Array.from(e.target.files ?? []),
                                )
                            }
                        />
                    </label>
                    <ErrorList errors={form.errors} />
                    <Button type="submit" disabled={form.processing}>
                        Catat item selesai
                    </Button>
                </form>
            )}
        </Card>
    );
}

export function ComplaintForm({
    reportId,
    items,
    open: controlledOpen,
    onClose: controlledOnClose,
}: {
    reportId: string;
    items: DamageItem[];
    open?: boolean;
    onClose?: () => void;
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const isOpen = controlledOpen ?? internalOpen;
    const form = useForm({
        reason: '',
        item_id: '',
        request_key: newDamageRequestKey(),
    });

    function closeModal() {
        if (form.processing) {
            return;
        }
        if (controlledOnClose) {
            controlledOnClose();
        } else {
            setInternalOpen(false);
        }
        form.clearErrors();
    }

    return (
        <>
            {!isControlled && (
                <div>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setInternalOpen(true)}
                    >
                        <MessageSquarePlus
                            className="size-3.5"
                            aria-hidden="true"
                        />
                        Ajukan komplain ulang hasil perbaikan
                    </Button>
                </div>
            )}

            <Modal
                open={isOpen}
                onClose={closeModal}
                title="Ajukan Komplain Ulang Hasil Perbaikan"
                width="max-w-lg"
            >
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(`/pelaporan/${reportId}/complaints`, {
                            preserveScroll: true,
                            onSuccess: () => {
                                form.setData({
                                    reason: '',
                                    item_id: '',
                                    request_key: newDamageRequestKey(),
                                });
                                if (controlledOnClose) {
                                    controlledOnClose();
                                } else {
                                    setInternalOpen(false);
                                }
                            },
                        });
                    }}
                >
                    <p className="border-base-300 bg-base-200/50 text-muted rounded-lg border p-3 text-xs">
                        Pengajuan dicatat dengan referensi laporan ini. Histori
                        selesai tidak ditimpa dan laporan tidak otomatis dibuka
                        ulang.
                    </p>

                    <div className="space-y-1">
                        <label className="text-base-content block text-xs font-medium">
                            Item terdampak
                        </label>
                        <select
                            aria-label="Item komplain"
                            className={inputClass}
                            value={form.data.item_id}
                            onChange={(e) =>
                                form.setData('item_id', e.target.value)
                            }
                        >
                            <option value="">Laporan secara keseluruhan</option>
                            {items.map((i) => (
                                <option key={i.id} value={i.id}>
                                    {i.description}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-base-content block text-xs font-medium">
                            Alasan komplain{' '}
                            <span className="text-error">*</span>
                        </label>
                        <textarea
                            aria-label="Alasan komplain"
                            className={inputClass}
                            rows={3}
                            value={form.data.reason}
                            onChange={(e) =>
                                form.setData('reason', e.target.value)
                            }
                            required
                            placeholder="Jelaskan hasil perbaikan yang kembali bermasalah"
                        />
                    </div>

                    <ErrorList errors={form.errors} />

                    <div className="border-base-200 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={form.processing}
                            onClick={closeModal}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing
                                ? 'Mengirim...'
                                : 'Kirim komplain ulang'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

export function LogbookForm({ today }: { today: string }) {
    const [open, setOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const form = useForm<{
        work_date: string;
        description: string;
        source: string;
        request_key: string;
        photos: File[];
    }>({
        work_date: today,
        description: '',
        source: 'other_work',
        request_key: newDamageRequestKey(),
        photos: [],
    });

    function closeModal() {
        if (form.processing) {
            return;
        }
        setOpen(false);
        form.clearErrors();
    }

    return (
        <>
            <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                        <h2 className="text-base-content text-sm font-semibold">
                            Catat logbook pekerjaan lain / perintah pimpinan
                        </h2>
                        <p className="text-muted text-xs">
                            Catatan harian ini tidak membuat tiket kerusakan dan
                            tidak memerlukan klaim.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setOpen(true)}
                        className="shrink-0 gap-1.5"
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Catat logbook pekerjaan lain / perintah pimpinan
                    </Button>
                </div>
            </Card>

            <Modal
                open={open}
                onClose={closeModal}
                title="Catat Logbook Pekerjaan Lain / Perintah Pimpinan"
                width="max-w-xl"
            >
                <form
                    key={formKey}
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post('/pelaporan/logbook', {
                            forceFormData: true,
                            onSuccess: () => {
                                form.setData({
                                    work_date: today,
                                    description: '',
                                    source: 'other_work',
                                    request_key: newDamageRequestKey(),
                                    photos: [],
                                });
                                setFormKey((prev) => prev + 1);
                                setOpen(false);
                            },
                        });
                    }}
                >
                    <p className="border-base-300 bg-base-200/50 text-muted rounded-lg border p-3 text-xs">
                        Catatan harian ini tidak membuat tiket kerusakan dan
                        tidak memerlukan klaim.
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-base-content block text-xs font-medium">
                                Tanggal logbook{' '}
                                <span className="text-error">*</span>
                            </label>
                            <input
                                aria-label="Tanggal logbook"
                                className={inputClass}
                                type="date"
                                max={today}
                                value={form.data.work_date}
                                onChange={(e) =>
                                    form.setData('work_date', e.target.value)
                                }
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-base-content block text-xs font-medium">
                                Sumber pekerjaan{' '}
                                <span className="text-error">*</span>
                            </label>
                            <select
                                aria-label="Sumber logbook"
                                className={inputClass}
                                value={form.data.source}
                                onChange={(e) =>
                                    form.setData('source', e.target.value)
                                }
                            >
                                <option value="other_work">
                                    Pekerjaan harian lain
                                </option>
                                <option value="leader_instruction">
                                    Perintah pimpinan
                                </option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-base-content block text-xs font-medium">
                            Uraian pekerjaan dan hasil{' '}
                            <span className="text-error">*</span>
                        </label>
                        <textarea
                            aria-label="Uraian logbook"
                            className={inputClass}
                            rows={3}
                            value={form.data.description}
                            onChange={(e) =>
                                form.setData('description', e.target.value)
                            }
                            required
                            placeholder="Uraian pekerjaan dan hasil"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-base-content block text-xs font-medium">
                            Foto dokumentasi logbook (wajib){' '}
                            <span className="text-error">*</span>
                        </label>
                        <input
                            type="file"
                            className="file-input file-input-sm w-full"
                            multiple
                            accept="image/jpeg,image/png"
                            required
                            onChange={(e) =>
                                form.setData(
                                    'photos',
                                    Array.from(e.target.files ?? []),
                                )
                            }
                        />
                    </div>

                    <ErrorList errors={form.errors} />

                    <div className="border-base-200 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={form.processing}
                            onClick={closeModal}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing
                                ? 'Menyimpan...'
                                : 'Simpan logbook'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
