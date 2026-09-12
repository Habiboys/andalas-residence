import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Button, Drawer, FormField, inputClass, StatusBadge, CardSkeleton } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";

type Content = {
    id: string;
    key: string;
    title: string;
    content: string | null;
    published?: boolean;
};

export default function KelolaProfil() {
    const { data, loading, reload } = useAndalasApi<Content[]>("/api/andalas/landing/contents");
    const [edit, setEdit] = useState<Content | null>(null);
    const [form, setForm] = useState<{ title: string; content: string; published: boolean }>({ title: "", content: "", published: true });
    const [busy, setBusy] = useState(false);

    async function openEdit(item: Content) {
        setForm({ title: item.title ?? "", content: item.content ?? "", published: item.published ?? true });
        setEdit(item);
    }

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (!edit) return;
        setBusy(true);
        try {
            await andalasApi.put(`/api/andalas/landing/contents/${edit.id}`, form);
            setEdit(null);
            await reload();
            toast.success("Konten profil berhasil disimpan.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Gagal menyimpan konten");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="p-6 space-y-4">
            <PageHeader title="Kelola Profil" subtitle="Edit konten bagian Profil (sejarah, visi misi, struktur organisasi)" />
            {loading && <CardSkeleton items={3} />}
            {(data ?? []).map((item) => (
                <Card key={item.id} className="p-5">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-primary">{item.title}</h3>
                                {item.published ? <StatusBadge status="aktif" /> : <StatusBadge status="draft" />}
                            </div>
                            <p className="text-xs text-muted font-mono mb-2">{item.key}</p>
                            <p className="text-sm text-muted line-clamp-3 whitespace-pre-line">{item.content}</p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>Edit</Button>
                    </div>
                </Card>
            ))}

            <Drawer
                open={!!edit}
                onClose={() => setEdit(null)}
                        title={`Edit ${edit?.title ?? ""}`}
                width="w-full max-w-xl"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEdit(null)}>Batal</Button>
                        <Button type="submit" form="kelola-profil-form" disabled={busy}>Simpan</Button>
                    </div>
                }
            >
                <form id="kelola-profil-form" onSubmit={save} className="space-y-3">
                    <FormField label="Judul"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></FormField>
                    <FormField label="Konten">
                        <textarea rows={10} className={inputClass} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
                    </FormField>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
                        Tampilkan di publik
                    </label>
                </form>
            </Drawer>
        </div>
    );
}
