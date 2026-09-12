import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, DataTable, Button, Drawer, FormField, inputClass, TableSkeleton, ConfirmDialog } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";

type MhsRow = {
  id: string;
  angkatan?: string;
  status_huni?: string;
  user?: { nim_nip?: string; nama?: string; email?: string };
  prodi?: { id?: string; name?: string };
  periode?: { id?: string; nama_periode?: string };
};

type ProdiRow = { id: string; name?: string };
type PeriodeRow = { id: string; nama_periode?: string };

const emptyForm = {
  nim_nip: "",
  nama: "",
  email: "",
  password: "",
  no_hp: "",
  prodi_id: "",
  periode_id: "",
  angkatan: "",
  status_huni: "calon",
};

export default function DataMahasiswa() {
  const { data, loading, reload } = useAndalasApi<MhsRow[]>("/api/andalas/mahasiswa");
  const { data: prodi } = useAndalasApi<ProdiRow[]>("/api/andalas/master/prodi");
  const { data: periode } = useAndalasApi<PeriodeRow[]>("/api/andalas/master/periode");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MhsRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<MhsRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: MhsRow) {
    setEditing(row);
    setForm({
      nim_nip: row.user?.nim_nip ?? "",
      nama: row.user?.nama ?? "",
      email: row.user?.email ?? "",
      password: "",
      no_hp: "",
      prodi_id: row.prodi?.id ?? "",
      periode_id: row.periode?.id ?? "",
      angkatan: row.angkatan ?? "",
      status_huni: row.status_huni ?? "calon",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        const payload = { ...form };
        if (!payload.password) delete (payload as { password?: string }).password;
        await andalasApi.put(`/api/andalas/mahasiswa/${editing.id}`, payload);
      } else {
        await andalasApi.post("/api/andalas/mahasiswa", form);
      }
      setOpen(false);
      await reload();
      toast.success(editing ? "Data mahasiswa berhasil diperbarui." : "Mahasiswa berhasil ditambahkan.");
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
      await andalasApi.delete(`/api/andalas/mahasiswa/${deleting.id}`);
      toast.success("Mahasiswa berhasil dihapus.");
      setDeleting(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeletingBusy(false);
    }
  }

  const columns = [
    { key: "nim", label: "NIM", render: (r: MhsRow) => r.user?.nim_nip ?? "-" },
    { key: "nama", label: "Nama", render: (r: MhsRow) => r.user?.nama ?? "-" },
    { key: "prodi", label: "Prodi", render: (r: MhsRow) => r.prodi?.name ?? "-" },
    { key: "angkatan", label: "Angkatan" },
    { key: "status_huni", label: "Status Huni" },
    { key: "email", label: "Email", render: (r: MhsRow) => r.user?.email ?? "-" },
    {
      key: "aksi",
      label: "",
      render: (r: MhsRow) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleting(r)}>Hapus</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Data Mahasiswa"
        subtitle="Kelola data mahasiswa penghuni asrama"
        actions={<Button onClick={openCreate}>Tambah Mahasiswa</Button>}
      />
      <Card className="p-4">
        {loading ? <TableSkeleton /> : (
          <DataTable columns={columns as never} data={(data ?? []) as never} searchKeys={["angkatan", "status_huni"]} />
        )}
      </Card>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Mahasiswa" : "Tambah Mahasiswa"}
        width="w-full max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" form="mahasiswa-form" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        }
      >
        <form id="mahasiswa-form" onSubmit={save} className="space-y-3">
          <FormField label="NIM"><input className={inputClass} value={form.nim_nip} onChange={(e) => setForm({ ...form, nim_nip: e.target.value })} required /></FormField>
          <FormField label="Nama"><input className={inputClass} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required /></FormField>
          <FormField label="Email"><input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></FormField>
          <FormField label={editing ? "Password (kosongkan jika tidak diubah)" : "Password"}>
            <input type="password" className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
          </FormField>
          <FormField label="Prodi">
            <select className={inputClass} value={form.prodi_id} onChange={(e) => setForm({ ...form, prodi_id: e.target.value })} required>
              <option value="">Pilih prodi</option>
              {(prodi ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>
          <FormField label="Periode">
            <select className={inputClass} value={form.periode_id} onChange={(e) => setForm({ ...form, periode_id: e.target.value })} required>
              <option value="">Pilih periode</option>
              {(periode ?? []).map((p) => <option key={p.id} value={p.id}>{p.nama_periode}</option>)}
            </select>
          </FormField>
          <FormField label="Angkatan"><input className={inputClass} value={form.angkatan} onChange={(e) => setForm({ ...form, angkatan: e.target.value })} required /></FormField>
          <FormField label="Status Huni">
            <select className={inputClass} value={form.status_huni} onChange={(e) => setForm({ ...form, status_huni: e.target.value })}>
              <option value="calon">Calon</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
              <option value="keluar">Keluar</option>
            </select>
          </FormField>
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingBusy}
        title="Hapus Mahasiswa"
        message={`Hapus mahasiswa ${deleting?.user?.nama ?? ""}? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}
