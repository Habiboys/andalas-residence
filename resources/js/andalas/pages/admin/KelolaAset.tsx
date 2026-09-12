import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, DataTable, StatusBadge, Button, Drawer, FormField, inputClass, TableSkeleton, ConfirmDialog } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";

type AsetRow = {
  id: string;
  kode_inventaris?: string;
  nama_aset?: string;
  kategori?: string;
  kondisi?: string;
  kamar?: { id?: string; nomor_kamar?: string };
};
type KamarOption = { id: string; nomor_kamar?: string; lantai?: { gedung?: { kode_gedung?: string } } };

export default function KelolaAset() {
  const { data, loading, reload } = useAndalasApi<AsetRow[]>("/api/andalas/aset");
  const { data: gedung } = useAndalasApi<Array<{ lantai?: Array<{ kamar?: KamarOption[] }> }>>("/api/andalas/gedung");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AsetRow | null>(null);
  const [form, setForm] = useState({ kode_inventaris: "", nama_aset: "", kategori: "", kondisi: "baik", kamar_id: "", nilai_aset: "" });
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<AsetRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const kamarOptions = (gedung ?? []).flatMap((g) => (g.lantai ?? []).flatMap((l) => l.kamar ?? []));

  function openCreate() {
    setEditing(null);
    setForm({ kode_inventaris: "", nama_aset: "", kategori: "", kondisi: "baik", kamar_id: "", nilai_aset: "" });
    setOpen(true);
  }

  function openEdit(row: AsetRow) {
    setEditing(row);
    setForm({
      kode_inventaris: row.kode_inventaris ?? "",
      nama_aset: row.nama_aset ?? "",
      kategori: row.kategori ?? "",
      kondisi: row.kondisi ?? "baik",
      kamar_id: row.kamar?.id ?? "",
      nilai_aset: "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        kamar_id: form.kamar_id || null,
        nilai_aset: form.nilai_aset ? Number(form.nilai_aset) : null,
      };
      if (editing) {
        await andalasApi.put(`/api/andalas/aset/${editing.id}`, payload);
      } else {
        await andalasApi.post("/api/andalas/aset", payload);
      }
      setOpen(false);
      await reload();
      toast.success(editing ? "Aset berhasil diperbarui." : "Aset berhasil ditambahkan.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await andalasApi.delete(`/api/andalas/aset/${deleting.id}`);
      toast.success("Aset berhasil dihapus.");
      setDeleting(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeletingBusy(false);
    }
  }

  const columns = [
    { key: "kode_inventaris", label: "Kode" },
    { key: "nama_aset", label: "Nama Aset" },
    { key: "kategori", label: "Kategori" },
    { key: "kamar", label: "Kamar", render: (r: AsetRow) => r.kamar?.nomor_kamar ?? "Umum" },
    { key: "kondisi", label: "Kondisi", render: (r: AsetRow) => <StatusBadge status={r.kondisi ?? "baik"} /> },
    {
      key: "aksi",
      label: "",
      render: (r: AsetRow) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleting(r)}>Hapus</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Kelola Aset" subtitle="Inventaris aset asrama" actions={<Button onClick={openCreate}>Tambah Aset</Button>} />
      <Card className="p-4">
        {loading ? <TableSkeleton /> : (
          <DataTable columns={columns as never} data={(data ?? []) as never} />
        )}
      </Card>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Aset" : "Tambah Aset"}
        width="w-full max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" form="kelola-aset-form" disabled={busy}>Simpan</Button>
          </div>
        }
      >
        <form id="kelola-aset-form" onSubmit={save} className="space-y-3">
          <FormField label="Kode Inventaris"><input className={inputClass} value={form.kode_inventaris} onChange={(e) => setForm({ ...form, kode_inventaris: e.target.value })} required /></FormField>
          <FormField label="Nama Aset"><input className={inputClass} value={form.nama_aset} onChange={(e) => setForm({ ...form, nama_aset: e.target.value })} required /></FormField>
          <FormField label="Kategori"><input className={inputClass} value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} required /></FormField>
          <FormField label="Kamar">
            <select className={inputClass} value={form.kamar_id} onChange={(e) => setForm({ ...form, kamar_id: e.target.value })}>
              <option value="">Fasilitas Umum</option>
              {kamarOptions.map((k) => <option key={k.id} value={k.id}>Kamar {k.nomor_kamar}</option>)}
            </select>
          </FormField>
          <FormField label="Kondisi">
            <select className={inputClass} value={form.kondisi} onChange={(e) => setForm({ ...form, kondisi: e.target.value })}>
              <option value="baik">Baik</option>
              <option value="rusak_ringan">Rusak Ringan</option>
              <option value="rusak_berat">Rusak Berat</option>
              <option value="hilang">Hilang</option>
            </select>
          </FormField>
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingBusy}
        title="Hapus Aset"
        message={`Hapus aset ${deleting?.nama_aset ?? ""}? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}
