import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Table, Button, Drawer, FormField, inputClass, TableSkeleton, ConfirmDialog } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";

type KegiatanRow = {
  id: string;
  judul?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  lokasi?: string;
  deskripsi?: string;
};

const emptyForm = { judul: "", deskripsi: "", lokasi: "", tanggal_mulai: "", tanggal_selesai: "" };

export default function AdminJadwalKegiatan() {
  const { data, loading, reload } = useAndalasApi<KegiatanRow[]>("/api/andalas/kegiatan");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KegiatanRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<KegiatanRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: KegiatanRow) {
    setEditing(row);
    setForm({
      judul: row.judul ?? "",
      deskripsi: row.deskripsi ?? "",
      lokasi: row.lokasi ?? "",
      tanggal_mulai: String(row.tanggal_mulai ?? "").slice(0, 16),
      tanggal_selesai: String(row.tanggal_selesai ?? "").slice(0, 16),
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        await andalasApi.put(`/api/andalas/kegiatan/${editing.id}`, form);
      } else {
        await andalasApi.post("/api/andalas/kegiatan", form);
      }
      setOpen(false);
      await reload();
      toast.success(editing ? "Kegiatan berhasil diperbarui." : "Kegiatan berhasil ditambahkan.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await andalasApi.delete(`/api/andalas/kegiatan/${deleting.id}`);
      toast.success("Kegiatan berhasil dihapus.");
      setDeleting(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <div className="p-6">
      <PageHeader title="Jadwal Kegiatan" subtitle="Kelola kegiatan asrama" actions={<Button onClick={openCreate}>Tambah Kegiatan</Button>} />
      <Card>
        {loading ? <TableSkeleton /> : (
          <Table
            columns={[
              { key: "judul", label: "Judul" },
              { key: "tanggal_mulai", label: "Mulai", render: (r: KegiatanRow) => String(r.tanggal_mulai ?? "").slice(0, 16).replace("T", " ") },
              { key: "lokasi", label: "Lokasi" },
              {
                key: "aksi",
                label: "",
                render: (r: KegiatanRow) => (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleting(r)}>Hapus</Button>
                  </div>
                ),
              },
            ]}
            data={data ?? []}
            emptyMessage="Belum ada kegiatan"
          />
        )}
      </Card>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Kegiatan" : "Tambah Kegiatan"}
        width="w-full max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" form="kegiatan-form" disabled={busy}>Simpan</Button>
          </div>
        }
      >
        <form id="kegiatan-form" onSubmit={save} className="space-y-3">
          <FormField label="Judul"><input className={inputClass} value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} required /></FormField>
          <FormField label="Lokasi"><input className={inputClass} value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} /></FormField>
          <FormField label="Mulai"><input type="datetime-local" className={inputClass} value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} required /></FormField>
          <FormField label="Selesai"><input type="datetime-local" className={inputClass} value={form.tanggal_selesai} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} /></FormField>
          <FormField label="Deskripsi"><textarea className={inputClass} rows={3} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} /></FormField>
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingBusy}
        title="Hapus Kegiatan"
        message={`Hapus kegiatan ${deleting?.judul ?? ""}? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}
