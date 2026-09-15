import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { PageHeader, Card, Button, Drawer, FormField, inputClass, StatusBadge } from "../../components/ui";
import { update as contentsUpdate } from "@/routes/andalas/landing/contents";

type Content = {
    id: string;
    key: string;
    title: string;
    content: string | null;
    published?: boolean;
};

type Props = { contents: Content[] };

const emptyForm = { title: "", content: "", published: true };

export default function KelolaProfil({ contents }: Props) {
    const [edit, setEdit] = useState<Content | null>(null);
    const { data, setData, put, errors, processing, resetAndClearErrors, clearErrors } = useForm(emptyForm);

    function openEdit(item: Content) {
        setData({ title: item.title ?? "", content: item.content ?? "", published: item.published ?? true });
        clearErrors();
        setEdit(item);
    }

    function save(e: React.FormEvent) {
        e.preventDefault();
        if (!edit) return;
        put(contentsUpdate.url({ id: edit.id }), { onSuccess: () => setEdit(null) });
    }

    return (
        <div className="space-y-4">
            <PageHeader title="Kelola Profil" subtitle="Edit konten bagian Profil (sejarah, visi misi, struktur organisasi)" />
            {(contents ?? []).map((item) => (
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
                        <Button type="button" variant="secondary" onClick={() => setEdit(null)}>Batal</Button>
                        <Button type="submit" form="kelola-profil-form" disabled={processing}>{processing ? "Menyimpan..." : "Simpan"}</Button>
                    </div>
                }
            >
                <form id="kelola-profil-form" onSubmit={save} className="space-y-3">
                    <FormField label="Judul"><input className={inputClass} value={data.title} onChange={(e) => setData("title", e.target.value)} required /></FormField>
                    {errors.title && <p className="text-sm text-error">{errors.title}</p>}
                    <FormField label="Konten">
                        <textarea rows={10} className={inputClass} value={data.content} onChange={(e) => setData("content", e.target.value)} />
                    </FormField>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={data.published} onChange={(e) => setData("published", e.target.checked)} />
                        Tampilkan di publik
                    </label>
                </form>
            </Drawer>
        </div>
    );
}