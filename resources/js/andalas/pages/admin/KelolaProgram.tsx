import { useState } from "react";
import { useForm, router } from "@inertiajs/react";
import { PageHeader, Card, Button, Drawer, FormField, inputClass, StatusBadge, ConfirmDialog, RowActions } from "../../components/ui";
import { store as pStore, update as pUpdate, destroy as pDestroy } from "@/routes/andalas/landing/program";
import { store as sStore, update as sUpdate, destroy as sDestroy } from "@/routes/andalas/landing/program-sub";

type Sub = { id: string; judul?: string; deskripsi?: string; gambar?: string };
type Program = { id: string; nama?: string; deskripsi?: string; ikon?: string; published?: boolean; sub?: Sub[] };

type Props = { program: Program[] };

const pDefaults = { nama: "", deskripsi: "", ikon: "", published: true };
const sDefaults = { judul: "", deskripsi: "", gambar: null as File | null };

export default function KelolaProgram({ program }: Props) {
    const [programModal, setProgramModal] = useState(false);
    const [editingProgram, setEditingProgram] = useState<Program | null>(null);
    const [subModal, setSubModal] = useState<{ programId: string; sub?: Sub } | null>(null);
    const [deleting, setDeleting] = useState<{ type: "program" | "sub"; id: string; label: string } | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);

    const pForm = useForm(pDefaults);
    const sForm = useForm(sDefaults);

    function openProgram(item?: Program) {
        setEditingProgram(item ?? null);
        pForm.setData({ nama: item?.nama ?? "", deskripsi: item?.deskripsi ?? "", ikon: item?.ikon ?? "", published: item?.published ?? true });
        pForm.clearErrors();
        setProgramModal(true);
    }

    function openSub(programId: string, sub?: Sub) {
        setSubModal({ programId, sub });
        sForm.setData({ judul: sub?.judul ?? "", deskripsi: sub?.deskripsi ?? "", gambar: null });
        sForm.clearErrors();
    }

    function saveProgram(e: React.FormEvent) {
        e.preventDefault();
        if (editingProgram) {
            pForm.put(pUpdate.url({ id: editingProgram.id }), { onSuccess: () => setProgramModal(false) });
        } else {
            pForm.post(pStore.url(), { onSuccess: () => setProgramModal(false) });
        }
    }

    function saveSub(e: React.FormEvent) {
        e.preventDefault();
        if (!subModal) return;
        if (subModal.sub) {
            sForm.put(sUpdate.url({ id: subModal.sub.id }), { onSuccess: () => setSubModal(null) });
        } else {
            sForm.transform((form) => ({ ...form, program_id: subModal.programId }));
            sForm.post(sStore.url(), { onSuccess: () => setSubModal(null) });
        }
    }

    function confirmDelete() {
        if (!deleting) return;
        setDeletingBusy(true);
        const url = deleting.type === "program"
            ? pDestroy.url({ id: deleting.id })
            : sDestroy.url({ id: deleting.id });
        router.delete(url, {
            onSuccess: () => setDeleting(null),
            onFinish: () => setDeletingBusy(false),
        });
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title="Kelola Program"
                subtitle="Program pembinaan beserta sub-programnya"
                actions={<Button onClick={() => openProgram()}>Tambah Program</Button>}
            />
            {(program ?? []).map((p) => (
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
                            <RowActions
                                onEdit={() => openProgram(p)}
                                onDelete={() => setDeleting({ type: "program", id: p.id, label: p.nama ?? "" })}
                            />
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
                                    <RowActions
                                        onEdit={() => openSub(p.id, s)}
                                        onDelete={() => setDeleting({ type: "sub", id: s.id, label: s.judul ?? "" })}
                                    />
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
                        <Button type="button" variant="secondary" onClick={() => setProgramModal(false)}>Batal</Button>
                        <Button type="submit" form="kelola-program-form" disabled={pForm.processing}>{pForm.processing ? "Menyimpan..." : "Simpan"}</Button>
                    </div>
                }
            >
                <form id="kelola-program-form" onSubmit={saveProgram} className="space-y-3">
                    <FormField label="Nama"><input className={inputClass} value={pForm.data.nama} onChange={(e) => pForm.setData("nama", e.target.value)} required /></FormField>
                    {pForm.errors.nama && <p className="text-sm text-error">{pForm.errors.nama}</p>}
                    <FormField label="Deskripsi">
                        <textarea rows={4} className={inputClass} value={pForm.data.deskripsi} onChange={(e) => pForm.setData("deskripsi", e.target.value)} />
                    </FormField>
                    <FormField label="Ikon (nama lucide, opsional)"><input className={inputClass} value={pForm.data.ikon} onChange={(e) => pForm.setData("ikon", e.target.value)} /></FormField>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={pForm.data.published} onChange={(e) => pForm.setData("published", e.target.checked)} />
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
                        <Button type="button" variant="secondary" onClick={() => setSubModal(null)}>Batal</Button>
                        <Button type="submit" form="kelola-sub-form" disabled={sForm.processing}>{sForm.processing ? "Menyimpan..." : "Simpan"}</Button>
                    </div>
                }
            >
                <form id="kelola-sub-form" onSubmit={saveSub} className="space-y-3">
                    <FormField label="Judul"><input className={inputClass} value={sForm.data.judul} onChange={(e) => sForm.setData("judul", e.target.value)} required /></FormField>
                    {sForm.errors.judul && <p className="text-sm text-error">{sForm.errors.judul}</p>}
                    <FormField label="Deskripsi">
                        <textarea rows={6} className={inputClass} value={sForm.data.deskripsi} onChange={(e) => sForm.setData("deskripsi", e.target.value)} />
                    </FormField>
                    <FormField label="Gambar (opsional)">
                        <input type="file" className={inputClass} onChange={(e) => sForm.setData("gambar", e.target.files?.[0] ?? null)} />
                        {sForm.errors.gambar && <p className="text-sm text-error">{sForm.errors.gambar}</p>}
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