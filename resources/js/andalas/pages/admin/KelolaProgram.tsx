import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Button, Drawer, FormField, inputClass, StatusBadge, CardSkeleton, ConfirmDialog } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";

type Sub = { id: string; judul?: string; deskripsi?: string; gambar?: string };
type Program = { id: string; nama?: string; deskripsi?: string; ikon?: string; published?: boolean; sub?: Sub[] };

export default function KelolaProgram() {
    const { data, loading, reload } = useAndalasApi<Program[]>("/api/andalas/landing/program");
    const [programModal, setProgramModal] = useState(false);
    const [editingProgram, setEditingProgram] = useState<Program | null>(null);
    const [pForm, setPForm] = useState({ nama: "", deskripsi: "", ikon: "", published: true });
    const [busy, setBusy] = useState(false);

    const [subModal, setSubModal] = useState<{ programId: string; sub?: Sub } | null>(null);
    const [sForm, setSForm] = useState({ judul: "", deskripsi: "" });
    const [sFile, setSFile] = useState<File | null>(null);
    const [sBusy, setSBusy] = useState(false);
    const [deleting, setDeleting] = useState<{ type: "program" | "sub"; id: string; label: string } | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);

    function openProgram(item?: Program) {
        setEditingProgram(item ?? null);
        setPForm({ nama: item?.nama ?? "", deskripsi: item?.deskripsi ?? "", ikon: item?.ikon ?? "", published: item?.published ?? true });
        setProgramModal(true);
    }

    function openSub(programId: string, sub?: Sub) {
        setSubModal({ programId, sub });
        setSForm({ judul: sub?.judul ?? "", deskripsi: sub?.deskripsi ?? "" });
        setSFile(null);
    }

    async function saveProgram(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        try {
            if (editingProgram) {
                await andalasApi.put(`/api/andalas/landing/program/${editingProgram.id}`, pForm);
            } else {
                await andalasApi.post("/api/andalas/landing/program", pForm);
            }
            setProgramModal(false);
            await reload();
            toast.success(editingProgram ? "Program berhasil diperbarui." : "Program berhasil ditambahkan.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Gagal menyimpan program");
        } finally {
            setBusy(false);
        }
    }

    async function saveSub(e: React.FormEvent) {
        e.preventDefault();
        if (!subModal) return;
        setSBusy(true);
        try {
            const fd = new FormData();
            fd.append("judul", sForm.judul);
            fd.append("deskripsi", sForm.deskripsi);
            if (sFile) fd.append("gambar", sFile);
            if (subModal.sub) {
                fd.append("_method", "PUT");
                await andalasApi.post(`/api/andalas/landing/program-sub/${subModal.sub.id}`, fd);
            } else {
                fd.append("program_id", subModal.programId);
                await andalasApi.post("/api/andalas/landing/program-sub", fd);
            }
            setSubModal(null);
            await reload();
            toast.success(subModal?.sub ? "Sub-program berhasil diperbarui." : "Sub-program berhasil ditambahkan.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Gagal menyimpan sub-program");
        } finally {
            setSBusy(false);
        }
    }

    async function confirmDelete() {
        if (!deleting) return;
        setDeletingBusy(true);
        try {
            if (deleting.type === "program") {
                await andalasApi.delete(`/api/andalas/landing/program/${deleting.id}`);
            } else {
                await andalasApi.delete(`/api/andalas/landing/program-sub/${deleting.id}`);
            }
            toast.success(deleting.type === "program" ? "Program berhasil dihapus." : "Sub-program berhasil dihapus.");
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
                title="Kelola Program"
                subtitle="Program pembinaan beserta sub-programnya"
                actions={<Button onClick={() => openProgram()}>Tambah Program</Button>}
            />
            {loading && <CardSkeleton items={2} />}
            {(data ?? []).map((p) => (
                <Card key={p.id} className="p-5">
                    <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-primary">{p.nama}</h3>
                                {p.published ? <StatusBadge status="aktif" /> : <StatusBadge status="draft" />}
                            </div>
                            {p.deskripsi && <p className="text-sm text-muted line-clamp-2">{p.deskripsi}</p>}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <Button size="sm" variant="secondary" onClick={() => openSub(p.id)}>+ Sub</Button>
                            <Button size="sm" variant="secondary" onClick={() => openProgram(p)}>Edit</Button>
                            <Button size="sm" variant="danger" onClick={() => setDeleting({ type: "program", id: p.id, label: p.nama ?? "" })}>Hapus</Button>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                        {(p.sub ?? []).map((s) => (
                            <div key={s.id} className="rounded-box border border-base-300 bg-base-200 p-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="font-medium text-sm">{s.judul}</div>
                                    {s.deskripsi && <p className="text-xs text-muted line-clamp-1">{s.deskripsi.split("\n")[0]}</p>}
                                    {s.gambar && <p className="text-xs text-primary">Ada gambar</p>}
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <Button size="sm" variant="ghost" onClick={() => openSub(p.id, s)}>Edit</Button>
                                    <Button size="sm" variant="danger" onClick={() => setDeleting({ type: "sub", id: s.id, label: s.judul ?? "" })}>Hapus</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            ))}

            <Drawer
                open={programModal}
                onClose={() => setProgramModal(false)}
                title={editingProgram ? "Edit Program" : "Tambah Program"}
                width="w-full max-w-xl"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setProgramModal(false)}>Batal</Button>
                        <Button type="submit" form="kelola-program-form" disabled={busy}>Simpan</Button>
                    </div>
                }
            >
                <form id="kelola-program-form" onSubmit={saveProgram} className="space-y-3">
                    <FormField label="Nama"><input className={inputClass} value={pForm.nama} onChange={(e) => setPForm({ ...pForm, nama: e.target.value })} required /></FormField>
                    <FormField label="Deskripsi">
                        <textarea rows={4} className={inputClass} value={pForm.deskripsi} onChange={(e) => setPForm({ ...pForm, deskripsi: e.target.value })} />
                    </FormField>
                    <FormField label="Ikon (nama lucide, opsional)"><input className={inputClass} value={pForm.ikon} onChange={(e) => setPForm({ ...pForm, ikon: e.target.value })} /></FormField>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={pForm.published} onChange={(e) => setPForm({ ...pForm, published: e.target.checked })} />
                        Tampilkan di publik
                    </label>
                </form>
            </Drawer>

            <Drawer
                open={!!subModal}
                onClose={() => setSubModal(null)}
                title={subModal?.sub ? "Edit Sub-Program" : "Tambah Sub-Program"}
                width="w-full max-w-xl"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setSubModal(null)}>Batal</Button>
                        <Button type="submit" form="kelola-sub-form" disabled={sBusy}>Simpan</Button>
                    </div>
                }
            >
                <form id="kelola-sub-form" onSubmit={saveSub} className="space-y-3">
                    <FormField label="Judul"><input className={inputClass} value={sForm.judul} onChange={(e) => setSForm({ ...sForm, judul: e.target.value })} required /></FormField>
                    <FormField label="Deskripsi">
                        <textarea rows={6} className={inputClass} value={sForm.deskripsi} onChange={(e) => setSForm({ ...sForm, deskripsi: e.target.value })} />
                    </FormField>
                    <FormField label="Gambar (opsional)">
                        <input type="file" className={inputClass} onChange={(e) => setSFile(e.target.files?.[0] ?? null)} />
                    </FormField>
                </form>
            </Drawer>

            <ConfirmDialog
                open={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                loading={deletingBusy}
                title={deleting?.type === "program" ? "Hapus Program" : "Hapus Sub-Program"}
                message={
                    deleting?.type === "program"
                        ? `Hapus program "${deleting.label}" beserta seluruh sub-programnya? Tindakan ini tidak dapat dibatalkan.`
                        : `Hapus sub-program "${deleting?.label ?? ""}"? Tindakan ini tidak dapat dibatalkan.`
                }
            />
        </div>
    );
}
