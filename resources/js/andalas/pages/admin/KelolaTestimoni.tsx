import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { PageHeader, Card, Button, Drawer, FormField, inputClass, StatusBadge, ConfirmDialog, RowActions } from "../../components/ui";
import { store as testimoniStore, update as testimoniUpdate, destroy as testimoniDestroy } from "@/routes/andalas/landing/testimoni";

type Item = {
    id: string;
    nama?: string;
    prodi?: string;
    teks?: string;
    foto?: string;
    published?: boolean;
};

export default function KelolaTestimoni({ testimoni = [] }: { testimoni?: Item[] }) {
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<Item | null>(null);
    const { data, setData, post, put, processing, errors, reset } = useForm({ nama: "", prodi: "", teks: "", published: true, foto: null as File | null });
    const deleteForm = useForm<Record<string, string>>({});
    const [deleting, setDeleting] = useState<Item | null>(null);

    function openCreate() {
        setEditing(null);
        reset();
        setModal(true);
    }

    function openEdit(item: Item) {
        setEditing(item);
        setData({ nama: item.nama ?? "", prodi: item.prodi ?? "", teks: item.teks ?? "", published: item.published ?? true, foto: null });
        setModal(true);
    }

    function save(e: React.FormEvent) {
        e.preventDefault();
        if (editing) {
            put(testimoniUpdate.url({ id: editing.id }), {
                onSuccess: () => {
                    setModal(false);
                    setEditing(null);
                    reset();
                },
            });
        } else {
            post(testimoniStore.url(), {
                onSuccess: () => {
                    setModal(false);
                    reset();
                },
            });
        }
    }

    function confirmDelete() {
        if (!deleting) return;
        deleteForm.delete(testimoniDestroy.url({ id: deleting.id }), {
            onSuccess: () => setDeleting(null),
        });
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title="Kelola Testimoni"
                subtitle="Testimoni mahasiswa di halaman Beranda"
                actions={<Button onClick={openCreate}>Tambah</Button>}
            />
            {(testimoni ?? []).map((item) => (
                <Card key={item.id} className="p-5">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            {item.foto && <img src={`/storage/${item.foto}`} alt={item.nama} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />}
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-primary">{item.nama}</h3>
                                    {item.published ? <StatusBadge status="aktif" /> : <StatusBadge status="draft" />}
                                </div>
                                {item.prodi && <p className="text-xs text-muted">{item.prodi}</p>}
                                <p className="text-sm text-muted mt-1 italic line-clamp-2">"{item.teks}"</p>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <RowActions onEdit={() => openEdit(item)} onDelete={() => setDeleting(item)} />
                        </div>
                    </div>
                </Card>
            ))}

            <Drawer
                open={modal}
                onClose={() => setModal(false)}
                title={editing ? "Edit Testimoni" : "Tambah Testimoni"}
                width="w-full max-w-xl"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
                        <Button type="submit" form="kelola-testimoni-form" disabled={processing}>Simpan</Button>
                    </div>
                }
            >
                <form id="kelola-testimoni-form" onSubmit={save} className="space-y-3">
                    <FormField label="Nama">
                        <input className={inputClass} value={data.nama} onChange={(e) => setData("nama", e.target.value)} required />
                        {errors.nama && <p className="mt-1 text-sm text-error">{errors.nama}</p>}
                    </FormField>
                    <FormField label="Prodi">
                        <input className={inputClass} value={data.prodi} onChange={(e) => setData("prodi", e.target.value)} />
                        {errors.prodi && <p className="mt-1 text-sm text-error">{errors.prodi}</p>}
                    </FormField>
                    <FormField label="Teks">
                        <textarea rows={4} className={inputClass} value={data.teks} onChange={(e) => setData("teks", e.target.value)} required />
                        {errors.teks && <p className="mt-1 text-sm text-error">{errors.teks}</p>}
                    </FormField>
                    <FormField label="Foto (opsional)">
                        <input type="file" className={inputClass} onChange={(e) => setData("foto", e.target.files?.[0] ?? null)} />
                        {editing?.foto && <p className="text-xs text-muted">Foto saat ini: {editing.foto}</p>}
                    </FormField>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={data.published} onChange={(e) => setData("published", e.target.checked)} />
                        Tampilkan di publik
                    </label>
                    {errors.published && <p className="mt-1 text-sm text-error">{errors.published}</p>}
                </form>
            </Drawer>

            <ConfirmDialog
                open={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                loading={deleteForm.processing}
                title="Hapus Testimoni"
                message={`Hapus testimoni dari "${deleting?.nama ?? ""}"? Tindakan ini tidak dapat dibatalkan.`}
            />
        </div>
    );
}