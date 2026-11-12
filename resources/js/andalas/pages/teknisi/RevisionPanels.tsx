import { useForm } from '@inertiajs/react';
import { Button, Card, inputClass } from '../../components/ui';
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
        nomor_kamar: string;
        lantai?: { gedung?: { nama_gedung: string } };
    } | null;
    assets: { id: string; nama_aset: string }[];
    facilities: { id: string; nama_fasilitas: string }[];
}) {
    const form = useForm<{
        request_key: string;
        fasilitas_umum_id: string;
        items: ItemInput[];
    }>({
        request_key: newDamageRequestKey(),
        fasilitas_umum_id: '',
        items: [emptyItem()],
    });
    function edit(index: number, values: Partial<ItemInput>) {
        form.setData(
            'items',
            form.data.items.map((item, i) =>
                i === index ? { ...item, ...values } : item,
            ),
        );
    }
    return (
        <details>
            <summary className="cursor-pointer font-semibold">
                Buat laporan / tambah item kamar
            </summary>
            <form
                className="mt-3 space-y-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post('/andalas/laporan-kerusakan', {
                        forceFormData: true,
                        onSuccess: () =>
                            form.setData({
                                request_key: newDamageRequestKey(),
                                fasilitas_umum_id: '',
                                items: [emptyItem()],
                            }),
                    });
                }}
            >
                <p>
                    Penghuni: <strong>{name}</strong> /{' '}
                    {room?.lantai?.gedung?.nama_gedung} / Kamar{' '}
                    {room?.nomor_kamar}
                </p>
                <p className="text-muted text-sm">
                    Item otomatis ditambahkan ke laporan kamar yang masih Belum
                    Dikerjakan. Bila pekerjaan sebelumnya sudah dimulai,
                    pengiriman ini menjadi laporan baru tanpa mengubah pekerjaan
                    lama.
                </p>
                <select
                    aria-label="Lokasi laporan"
                    className={inputClass}
                    value={form.data.fasilitas_umum_id}
                    onChange={(e) => {
                        form.setData('fasilitas_umum_id', e.target.value);
                        form.setData('items', [emptyItem()]);
                    }}
                >
                    <option value="">Kamar saya</option>
                    {facilities.map((f) => (
                        <option key={f.id} value={f.id}>
                            {f.nama_fasilitas}
                        </option>
                    ))}
                </select>
                {form.data.items.map((item, index) => (
                    <Card className="space-y-2 p-4" key={index}>
                        <h3 className="font-medium">Item {index + 1}</h3>
                        <select
                            aria-label={`Aset item ${index + 1}`}
                            className={inputClass}
                            value={item.aset_id}
                            onChange={(e) =>
                                edit(index, { aset_id: e.target.value })
                            }
                        >
                            <option value="">Tanpa inventaris</option>
                            {assets.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.nama_aset}
                                </option>
                            ))}
                        </select>
                        <input
                            aria-label={`Lokasi item ${index + 1}`}
                            className={inputClass}
                            value={item.location_label}
                            onChange={(e) =>
                                edit(index, { location_label: e.target.value })
                            }
                            placeholder="Rincian lokasi dalam kamar/fasilitas"
                        />
                        <textarea
                            aria-label={`Deskripsi item ${index + 1}`}
                            className={inputClass}
                            required
                            value={item.description}
                            onChange={(e) =>
                                edit(index, { description: e.target.value })
                            }
                            placeholder="Kerusakan item ini"
                        />
                        <label className="block">
                            Foto awal item (opsional)
                            <input
                                type="file"
                                className="file-input w-full"
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
                        </label>
                        {form.data.items.length > 1 && (
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
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
                            </button>
                        )}
                    </Card>
                ))}
                <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    disabled={form.data.items.length >= 30}
                    onClick={() =>
                        form.setData('items', [...form.data.items, emptyItem()])
                    }
                >
                    Tambah item lain
                </button>
                <ErrorList errors={form.errors} />
                <Button disabled={form.processing}>Simpan item laporan</Button>
            </form>
        </details>
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
                    <Button disabled={form.processing}>
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
}: {
    reportId: string;
    items: DamageItem[];
}) {
    const form = useForm({
        reason: '',
        item_id: '',
        request_key: newDamageRequestKey(),
    });
    return (
        <details>
            <summary className="cursor-pointer font-medium">
                Ajukan komplain ulang hasil perbaikan
            </summary>
            <form
                className="mt-2 space-y-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post(`/pelaporan/${reportId}/complaints`, {
                        preserveScroll: true,
                        onSuccess: () => {
                            form.reset('reason');
                            form.setData('request_key', newDamageRequestKey());
                        },
                    });
                }}
            >
                <select
                    aria-label="Item komplain"
                    className={inputClass}
                    value={form.data.item_id}
                    onChange={(e) => form.setData('item_id', e.target.value)}
                >
                    <option value="">Laporan secara keseluruhan</option>
                    {items.map((i) => (
                        <option key={i.id} value={i.id}>
                            {i.description}
                        </option>
                    ))}
                </select>
                <textarea
                    aria-label="Alasan komplain"
                    className={inputClass}
                    value={form.data.reason}
                    onChange={(e) => form.setData('reason', e.target.value)}
                    required
                    placeholder="Jelaskan hasil perbaikan yang kembali bermasalah"
                />
                <p className="text-muted text-sm">
                    Pengajuan dicatat dengan referensi laporan ini. Histori
                    selesai tidak ditimpa dan laporan tidak otomatis dibuka
                    ulang.
                </p>
                <ErrorList errors={form.errors} />
                <Button disabled={form.processing}>Kirim komplain ulang</Button>
            </form>
        </details>
    );
}

export function LogbookForm({ today }: { today: string }) {
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
    return (
        <details>
            <summary className="cursor-pointer font-semibold">
                Catat logbook pekerjaan lain / perintah pimpinan
            </summary>
            <form
                className="mt-3 space-y-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post('/pelaporan/logbook', {
                        forceFormData: true,
                        onSuccess: () => {
                            form.reset('description', 'photos');
                            form.setData('request_key', newDamageRequestKey());
                        },
                    });
                }}
            >
                <p className="text-muted text-sm">
                    Catatan harian ini tidak membuat tiket kerusakan dan tidak
                    memerlukan klaim.
                </p>
                <input
                    aria-label="Tanggal logbook"
                    className={inputClass}
                    type="date"
                    max={today}
                    value={form.data.work_date}
                    onChange={(e) => form.setData('work_date', e.target.value)}
                    required
                />
                <select
                    aria-label="Sumber logbook"
                    className={inputClass}
                    value={form.data.source}
                    onChange={(e) => form.setData('source', e.target.value)}
                >
                    <option value="other_work">Pekerjaan harian lain</option>
                    <option value="leader_instruction">
                        Perintah pimpinan
                    </option>
                </select>
                <textarea
                    aria-label="Uraian logbook"
                    className={inputClass}
                    value={form.data.description}
                    onChange={(e) =>
                        form.setData('description', e.target.value)
                    }
                    required
                    placeholder="Uraian pekerjaan dan hasil"
                />
                <label className="block">
                    Foto dokumentasi logbook (wajib)
                    <input
                        type="file"
                        className="file-input w-full"
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
                </label>
                <ErrorList errors={form.errors} />
                <Button disabled={form.processing}>Simpan logbook</Button>
            </form>
        </details>
    );
}
