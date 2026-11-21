import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Camera,
    ImagePlus,
    MessageSquarePlus,
    Plus,
    Star,
    X,
} from 'lucide-react';
import { Badge, Button, Card, Modal, inputClass } from '../../components/ui';
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
    is_new?: boolean;
    reporter?: { id: string; nama: string; no_hp?: string | null } | null;
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

export function PhotoCaptureInput({
    files,
    onChange,
    maxFiles = 5,
    required = false,
    label,
}: {
    files: File[];
    onChange: (next: File[]) => void;
    maxFiles?: number;
    required?: boolean;
    label?: string;
}) {
    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);
    const inputId = useId();

    const previews = useMemo(
        () =>
            typeof URL !== 'undefined' &&
            typeof URL.createObjectURL === 'function'
                ? files.map((file) => URL.createObjectURL(file))
                : [],
        [files],
    );

    useEffect(() => {
        return () => {
            if (
                typeof URL !== 'undefined' &&
                typeof URL.revokeObjectURL === 'function'
            ) {
                previews.forEach((url) => URL.revokeObjectURL(url));
            }
        };
    }, [previews]);

    const appendFiles = (incoming: FileList | null) => {
        if (!incoming || incoming.length === 0) {
            return;
        }
        const merged = [...files, ...Array.from(incoming)].slice(0, maxFiles);
        onChange(merged);
    };

    const removeAt = (index: number) => {
        onChange(files.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            {label && (
                <label
                    htmlFor={inputId}
                    className="text-base-content block text-xs font-medium"
                >
                    {label} {required && <span className="text-error">*</span>}
                </label>
            )}
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    disabled={files.length >= maxFiles}
                    className="btn btn-outline btn-primary btn-sm flex-1 gap-1.5 sm:flex-none"
                >
                    <Camera className="size-4" aria-hidden="true" />
                    Ambil Foto Langsung
                </button>
                <button
                    type="button"
                    onClick={() => galleryRef.current?.click()}
                    disabled={files.length >= maxFiles}
                    className="btn btn-outline btn-sm flex-1 gap-1.5 sm:flex-none"
                >
                    <ImagePlus className="size-4" aria-hidden="true" />
                    Pilih Galeri
                </button>
            </div>
            <input
                ref={cameraRef}
                id={inputId}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                    appendFiles(e.target.files);
                    e.target.value = '';
                }}
            />
            <input
                ref={galleryRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                    appendFiles(e.target.files);
                    e.target.value = '';
                }}
            />
            {files.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {files.map((file, idx) => (
                        <div
                            key={`${file.name}-${idx}`}
                            className="border-base-300 bg-base-200 relative overflow-hidden rounded-lg border"
                        >
                            {previews[idx] ? (
                                <img
                                    src={previews[idx]}
                                    alt={file.name}
                                    className="aspect-square w-full object-cover"
                                />
                            ) : (
                                <div className="flex aspect-square items-center justify-center p-1 text-[10px] break-all">
                                    {file.name}
                                </div>
                            )}
                            <button
                                type="button"
                                aria-label={`Hapus foto ${idx + 1}`}
                                onClick={() => removeAt(idx)}
                                className="bg-neutral/80 text-neutral-content absolute top-1 right-1 flex size-5 items-center justify-center rounded-full"
                            >
                                <X className="size-3" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-muted text-xs">
                    Maksimal {maxFiles} foto (JPG/PNG/WebP). Ketuk Ambil Foto
                    Langsung untuk membuka kamera.
                </p>
            )}
        </div>
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
                            Selagi permohonan perbaikan kamar Anda masih aktif
                            (belum selesai), keluhan baru akan otomatis
                            digabungkan ke laporan tersebut dengan tanda{' '}
                            <strong>BARU</strong> agar teknisi langsung
                            mengetahuinya.
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
                                        placeholder="Contoh: Kamar mandi / atas pintu"
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
                                        placeholder="Jelaskan kerusakan yang ditemukan"
                                    />
                                </div>

                                <PhotoCaptureInput
                                    label="Foto awal item (opsional)"
                                    files={item.photos}
                                    onChange={(photos) =>
                                        edit(index, { photos })
                                    }
                                />
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
    const isNew = Boolean(item.is_new && !item.completed_at);

    return (
        <Card
            className={`space-y-2.5 p-3.5 ${
                isNew
                    ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
                    : ''
            }`}
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {isNew && <Badge color="orange">BARU</Badge>}
                        <p className="text-sm font-semibold">
                            {item.description}
                        </p>
                    </div>
                    {item.location_label && (
                        <p className="text-muted text-xs">
                            Lokasi: {item.location_label}
                        </p>
                    )}
                </div>
                <Badge color={item.completed_at ? 'green' : 'yellow'}>
                    {item.completed_at ? 'Selesai' : 'Belum selesai'}
                </Badge>
            </div>
            {item.completion_note && (
                <p className="bg-base-200/60 rounded p-2 text-xs">
                    Catatan selesai: {item.completion_note}
                </p>
            )}
            {item.photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {item.photos.map((p) => (
                        <a
                            className="btn btn-xs btn-outline"
                            key={p.id}
                            target="_blank"
                            rel="noreferrer"
                            href={`/andalas/tiket/foto/${p.id}`}
                        >
                            {p.type === 'after'
                                ? 'Lihat Bukti Selesai'
                                : 'Lihat Foto Awal'}
                        </a>
                    ))}
                </div>
            )}
            {canComplete && !item.completed_at && (
                <form
                    className="border-base-200 space-y-2.5 border-t pt-2.5"
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
                        placeholder="Catatan hasil perbaikan item ini"
                    />
                    <PhotoCaptureInput
                        label="Foto bukti item (opsional)"
                        files={form.data.photos}
                        onChange={(photos) => form.setData('photos', photos)}
                    />
                    <ErrorList errors={form.errors} />
                    <Button type="submit" size="sm" disabled={form.processing}>
                        {form.processing
                            ? 'Menyimpan...'
                            : 'Catat item selesai'}
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
    const [photoError, setPhotoError] = useState('');
    const form = useForm<{
        reason: string;
        item_id: string;
        rating: number;
        request_rework: boolean;
        photos: File[];
        request_key: string;
    }>({
        reason: '',
        item_id: '',
        rating: 5,
        request_rework: true,
        photos: [],
        request_key: newDamageRequestKey(),
    });

    function closeModal() {
        if (form.processing) {
            return;
        }
        setPhotoError('');
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
                        Komplain &amp; Beri Rating
                    </Button>
                </div>
            )}

            <Modal
                open={isOpen}
                onClose={closeModal}
                title="Ajukan Komplain Ulang &amp; Penilaian Perbaikan"
                width="max-w-lg"
            >
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        setPhotoError('');
                        form.post(`/pelaporan/${reportId}/complaints`, {
                            forceFormData: true,
                            preserveScroll: true,
                            onSuccess: () => {
                                form.setData({
                                    reason: '',
                                    item_id: '',
                                    rating: 5,
                                    request_rework: true,
                                    photos: [],
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
                        Berikan penilaian atas hasil perbaikan teknisi. Jika
                        masih ditemukan kerusakan, centang pengajuan perbaikan
                        ulang agar teknisi segera menindaklanjuti dengan laporan
                        baru tanpa menghapus riwayat selesai sebelumnya.
                    </p>

                    <div className="space-y-1.5">
                        <span className="text-base-content block text-xs font-medium">
                            Rating Hasil Perbaikan
                        </span>
                        <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-label={`Beri ${value} bintang`}
                                    onClick={() =>
                                        form.setData('rating', value)
                                    }
                                    className="btn btn-ghost btn-xs px-1.5"
                                >
                                    <Star
                                        className={`size-5 ${
                                            value <= form.data.rating
                                                ? 'fill-amber-400 text-amber-500'
                                                : 'text-base-content/30'
                                        }`}
                                    />
                                </button>
                            ))}
                            <span className="text-muted ml-1 text-xs">
                                ({form.data.rating}/5)
                            </span>
                        </div>
                    </div>

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
                            Catatan / Alasan komplain{' '}
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
                            placeholder="Jelaskan hasil perbaikan atau kerusakan yang masih terjadi"
                        />
                    </div>

                    <label className="border-base-300 bg-base-200/40 flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm">
                        <input
                            type="checkbox"
                            className="checkbox checkbox-primary checkbox-sm mt-0.5"
                            checked={form.data.request_rework}
                            onChange={(e) =>
                                form.setData('request_rework', e.target.checked)
                            }
                        />
                        <span>
                            <strong className="block text-xs sm:text-sm">
                                Ajukan permohonan perbaikan ulang ke teknisi
                            </strong>
                            <span className="text-muted block text-xs">
                                Otomatis menerbitkan permohonan perbaikan baru
                                dengan tanda BARU untuk teknisi.
                            </span>
                        </span>
                    </label>

                    {form.data.request_rework && (
                        <PhotoCaptureInput
                            label="Foto kondisi terbaru (opsional)"
                            files={form.data.photos}
                            onChange={(photos) =>
                                form.setData('photos', photos)
                            }
                        />
                    )}

                    {photoError && (
                        <p role="alert" className="text-error text-sm">
                            {photoError}
                        </p>
                    )}
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
                                : form.data.request_rework
                                  ? 'Kirim Komplain & Ajukan Perbaikan Ulang'
                                  : 'Kirim Komplain & Rating'}
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
    const [photoError, setPhotoError] = useState('');
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
        setPhotoError('');
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
                            Catatan harian ini tidak membuat permohonan
                            perbaikan baru dan tidak memerlukan klaim.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setOpen(true)}
                        className="w-full shrink-0 gap-1.5 sm:w-auto"
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Catat Logbook Pekerjaan
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
                        if (form.data.photos.length === 0) {
                            setPhotoError(
                                'Minimal satu foto dokumentasi pekerjaan wajib dilampirkan.',
                            );
                            return;
                        }
                        setPhotoError('');
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
                        Catatan harian ini tidak membuat permohonan perbaikan
                        baru dan tidak memerlukan klaim.
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

                    <PhotoCaptureInput
                        label="Foto dokumentasi logbook"
                        required
                        files={form.data.photos}
                        onChange={(photos) => {
                            setPhotoError('');
                            form.setData('photos', photos);
                        }}
                    />

                    {photoError && (
                        <p role="alert" className="text-error text-sm">
                            {photoError}
                        </p>
                    )}
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
