import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Button, Drawer, FormField, inputClass, StatusBadge, CardSkeleton, ConfirmDialog } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";

type Item = {
    id: string;
    kategori?: string;
    judul?: string;
    konten?: string;
    tanggal?: string;
    file?: string;
    published?: boolean;
};

const KATEGORI = ["regulasi", "sop", "panduan", "pengumuman"];
const KATEGORI_LABEL: Record<string, string> = { regulasi: "Regulasi", sop: "SOP", panduan: "Panduan", pengumuman: "Pengumuman" };

const emptyForm = { kategori: "regulasi", judul: "", konten: "", tanggal: "", published: true };

export default function KelolaInformasi() {
    const [kategori, setKategori] = useState<string>("semua");
    const { data, loading, reload } = useAndalasApi<Item[]>(`/api/andalas/landing/informasi${kategori === "semua" ? "" : `?kategori=${kategori}`}`);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<Item | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [deleting, setDeleting] = useState<Item | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);

    function openCreate() {
        setEditing(null);
        setForm({ ...emptyForm, kategori: kategori === "semua" ? "regulasi" : kategori });
        setFile(null);
        setModal(true);
    }

    function openEdit(item: Item) {
        setEditing(item);
        setForm({
            kategori: item.kategori ?? "regulasi",
            judul: item.judul ?? "",
            konten: item.konten ?? "",
            tanggal: item.tanggal ?? "",
            published: item.published ?? true,
        });
        setFile(null);
        setModal(true);
    }

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append("kategori", form.kategori);
            fd.append("judul", form.judul);
            fd.append("konten", form.konten);
            if (form.tanggal) fd.append("tanggal", form.tanggal);
            fd.append("published", form.published ? "1" : "0");
            if (file) fd.append("file", file);

            if (editing) {
                fd.append("_method", "PUT");
                await andalasApi.post(`/api/andalas/landing/informasi/${editing.id}`, fd);
            } else {
                await andalasApi.post("/api/andalas/landing/informasi", fd);
            }
            setModal(false);
            await reload();
            toast.success(editing ? "Informasi berhasil diperbarui." : "Informasi berhasil ditambahkan.");
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
            await andalasApi.delete(`/api/andalas/landing/informasi/${deleting.id}`);
            toast.success("Informasi berhasil dihapus.");
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
                title="Kelola Informasi"
                subtitle="Regulasi, SOP, Panduan, dan Pengumuman"
                actions={<Button onClick={openCreate}>Tambah</Button>}
            />
            <div className="flex flex-wrap gap-2">
                {["semua", ...KATEGORI].map((k) => (
                    <button
                        key={k}
                        onClick={() => setKategori(k)}
                        className={`btn btn-sm rounded-full ${kategori === k ? "btn-primary" : "btn-ghost"}`}
                    >
                        {k === "semua" ? "Semua" : KATEGORI_LABEL[k]}
                    </button>
                ))}
            </div>

            {loading && <CardSkeleton items={2} />}
            {(data ?? []).map((item) => (
                <Card key={item.id} className="p-5">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-primary">{item.judul}</h3>
                                {item.published ? <StatusBadge status="aktif" /> : <StatusBadge status="draft" />}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                                <span className="badge badge-ghost badge-sm uppercase tracking-wide">{KATEGORI_LABEL[item.kategori ?? ""] ?? item.kategori}</span>
                                {item.tanggal && <span>{item.tanggal}</span>}
                                {item.file && <span className="text-primary">Ada file</span>}
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
                title={editing ? "Edit Informasi" : "Tambah Informasi"}
                width="w-full max-w-xl"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
                        <Button type="submit" form="kelola-informasi-form" disabled={busy}>Simpan</Button>
                    </div>
                }
            >
                <form id="kelola-informasi-form" onSubmit={save} className="space-y-3">
                    <FormField label="Kategori">
                        <select className={inputClass} value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
                            {KATEGORI.map((k) => <option key={k} value={k}>{KATEGORI_LABEL[k]}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Judul"><input className={inputClass} value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} required /></FormField>
                    <FormField label="Konten">
                        <textarea rows={8} className={inputClass} value={form.konten} onChange={(e) => setForm({ ...form, konten: e.target.value })} />
                    </FormField>
                    <FormField label="Tanggal">
                        <input type="date" className={inputClass} value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
                    </FormField>
                    <FormField label="File (opsional)">
                        <input type="file" className={inputClass} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                        {editing?.file && <p className="text-xs text-muted">File saat ini: {editing.file}</p>}
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
                title="Hapus Informasi"
                message={`Hapus informasi "${deleting?.judul ?? ""}"? Tindakan ini tidak dapat dibatalkan.`}
            />
        </div>
    );
}
