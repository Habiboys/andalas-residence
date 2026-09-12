import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Button, Drawer, FormField, inputClass, StatusBadge, CardSkeleton, ConfirmDialog } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";

type Item = {
    id: string;
    nama?: string;
    prodi?: string;
    teks?: string;
    foto?: string;
    published?: boolean;
};

export default function KelolaTestimoni() {
    const { data, loading, reload } = useAndalasApi<Item[]>("/api/andalas/landing/testimoni");
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<Item | null>(null);
    const [form, setForm] = useState({ nama: "", prodi: "", teks: "", published: true });
    const [foto, setFoto] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [deleting, setDeleting] = useState<Item | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);

    function openCreate() {
        setEditing(null);
        setForm({ nama: "", prodi: "", teks: "", published: true });
        setFoto(null);
        setModal(true);
    }

    function openEdit(item: Item) {
        setEditing(item);
        setForm({ nama: item.nama ?? "", prodi: item.prodi ?? "", teks: item.teks ?? "", published: item.published ?? true });
        setFoto(null);
        setModal(true);
    }

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append("nama", form.nama);
            fd.append("prodi", form.prodi);
            fd.append("teks", form.teks);
            fd.append("published", form.published ? "1" : "0");
            if (foto) fd.append("foto", foto);

            if (editing) {
                fd.append("_method", "PUT");
                await andalasApi.post(`/api/andalas/landing/testimoni/${editing.id}`, fd);
            } else {
                await andalasApi.post("/api/andalas/landing/testimoni", fd);
            }
            setModal(false);
            await reload();
            toast.success(editing ? "Testimoni berhasil diperbarui." : "Testimoni berhasil ditambahkan.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
        } finally {
            setBusy(false);
        }
    }

    async function confirmDelete() {
        if (!deleting) return;
        setDeletingBusy(true);
        try {
            await andalasApi.delete(`/api/andalas/landing/testimoni/${deleting.id}`);
            toast.success("Testimoni berhasil dihapus.");
            setDeleting(null);
            await reload();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Gagal menghapus");
        } finally {
            setDeletingBusy(false);
        }
    }

    return (
        <div className="p-6 space-y-4">
            <PageHeader
                title="Kelola Testimoni"
                subtitle="Testimoni mahasiswa di halaman Beranda"
                actions={<Button onClick={openCreate}>Tambah</Button>}
            />
            {loading && <CardSkeleton items={3} />}
            {(data ?? []).map((item) => (
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
                            <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>Edit</Button>
                            <Button size="sm" variant="danger" onClick={() => setDeleting(item)}>Hapus</Button>
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
                        <Button type="submit" form="kelola-testimoni-form" disabled={busy}>Simpan</Button>
                    </div>
                }
            >
                <form id="kelola-testimoni-form" onSubmit={save} className="space-y-3">
                    <FormField label="Nama"><input className={inputClass} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required /></FormField>
                    <FormField label="Prodi"><input className={inputClass} value={form.prodi} onChange={(e) => setForm({ ...form, prodi: e.target.value })} /></FormField>
                    <FormField label="Teks">
                        <textarea rows={4} className={inputClass} value={form.teks} onChange={(e) => setForm({ ...form, teks: e.target.value })} required />
                    </FormField>
                    <FormField label="Foto (opsional)">
                        <input type="file" className={inputClass} onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
                        {editing?.foto && <p className="text-xs text-muted">Foto saat ini: {editing.foto}</p>}
                    </FormField>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
                        Tampilkan di publik
                    </label>
                </form>
            </Drawer>

            <ConfirmDialog
                open={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                loading={deletingBusy}
                title="Hapus Testimoni"
                message={`Hapus testimoni dari "${deleting?.nama ?? ""}"? Tindakan ini tidak dapat dibatalkan.`}
            />
        </div>
    );
}
