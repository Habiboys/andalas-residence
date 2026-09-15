import { useState } from "react";
import { useForm, router } from "@inertiajs/react";
import { PageHeader, Card, Button, Drawer, FormField, inputClass, StatusBadge, ConfirmDialog, RowActions } from "../../components/ui";
import { store as infoStore, update as infoUpdate, destroy as infoDestroy } from "@/routes/andalas/landing/informasi";

type Item = {
    id: string;
    kategori?: string;
    judul?: string;
    konten?: string;
    tanggal?: string;
    file?: string;
    published?: boolean;
};

type Props = { informasi: Item[] };

const KATEGORI = ["regulasi", "sop", "panduan", "pengumuman"];
const KATEGORI_LABEL: Record<string, string> = { regulasi: "Regulasi", sop: "SOP", panduan: "Panduan", pengumuman: "Pengumuman" };

const emptyForm = { kategori: "regulasi", judul: "", konten: "", tanggal: "", published: true, file: null as File | null };

export default function KelolaInformasi({ informasi }: Props) {
    const [kategori, setKategori] = useState<string>("semua");
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<Item | null>(null);
    const [deleting, setDeleting] = useState<Item | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);
    const { data, setData, post, put, errors, processing, resetAndClearErrors, clearErrors } = useForm(emptyForm);

    const filteredData = (informasi ?? []).filter((item) => kategori === "semua" || item.kategori === kategori);

    function openCreate() {
        setEditing(null);
        resetAndClearErrors();
        setData("kategori", kategori === "semua" ? "regulasi" : kategori);
        setModal(true);
    }

    function openEdit(item: Item) {
        setEditing(item);
        setData({
            kategori: item.kategori ?? "regulasi",
            judul: item.judul ?? "",
            konten: item.konten ?? "",
            tanggal: item.tanggal ?? "",
            published: item.published ?? true,
            file: null,
        });
        clearErrors();
        setModal(true);
    }

    function save(e: React.FormEvent) {
        e.preventDefault();
        if (editing) {
            put(infoUpdate.url({ id: editing.id }), { onSuccess: () => setModal(false) });
        } else {
            post(infoStore.url(), { onSuccess: () => setModal(false) });
        }
    }

    function confirmDelete() {
        if (!deleting) return;
        setDeletingBusy(true);
        router.delete(infoDestroy.url({ id: deleting.id }), {
            onSuccess: () => setDeleting(null),
            onFinish: () => setDeletingBusy(false),
        });
    }

    return (
        <div className="space-y-4">
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

            {filteredData.map((item) => (
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
                            <RowActions onEdit={() => openEdit(item)} onDelete={() => setDeleting(item)} />
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
                        <Button type="button" variant="secondary" onClick={() => setModal(false)}>Batal</Button>
                        <Button type="submit" form="kelola-informasi-form" disabled={processing}>{processing ? "Menyimpan..." : "Simpan"}</Button>
                    </div>
                }
            >
                <form id="kelola-informasi-form" onSubmit={save} className="space-y-3">
                    <FormField label="Kategori">
                        <select className={inputClass} value={data.kategori} onChange={(e) => setData("kategori", e.target.value)}>
                            {KATEGORI.map((k) => <option key={k} value={k}>{KATEGORI_LABEL[k]}</option>)}
                        </select>
                        {errors.kategori && <p className="text-sm text-error">{errors.kategori}</p>}
                    </FormField>
                    <FormField label="Judul"><input className={inputClass} value={data.judul} onChange={(e) => setData("judul", e.target.value)} required /></FormField>
                    {errors.judul && <p className="text-sm text-error">{errors.judul}</p>}
                    <FormField label="Konten">
                        <textarea rows={8} className={inputClass} value={data.konten} onChange={(e) => setData("konten", e.target.value)} />
                    </FormField>
                    <FormField label="Tanggal">
                        <input type="date" className={inputClass} value={data.tanggal} onChange={(e) => setData("tanggal", e.target.value)} />
                    </FormField>
                    <FormField label="File (opsional)">
                        <input type="file" className={inputClass} onChange={(e) => setData("file", e.target.files?.[0] ?? null)} />
                        {editing?.file && <p className="text-xs text-muted">File saat ini: {editing.file}</p>}
                        {errors.file && <p className="text-sm text-error">{errors.file}</p>}
                    </FormField>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={data.published} onChange={(e) => setData("published", e.target.checked)} />
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