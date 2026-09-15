import { useState } from "react";
import { useForm, router } from "@inertiajs/react";
import { PageHeader, Card, Table, Button, Drawer, FormField, inputClass, ConfirmDialog, RowActions } from "../../components/ui";
import { store as kegiatanStore, update as kegiatanUpdate, destroy as kegiatanDestroy } from "@/routes/andalas/kegiatan";

type KegiatanRow = {
  id: string;
  judul?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  lokasi?: string;
  deskripsi?: string;
};

type Props = { kegiatan: KegiatanRow[] };

const emptyForm = { judul: "", deskripsi: "", lokasi: "", tanggal_mulai: "", tanggal_selesai: "" };

export default function AdminJadwalKegiatan({ kegiatan }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KegiatanRow | null>(null);
  const [deleting, setDeleting] = useState<KegiatanRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const { data, setData, post, put, errors, processing, resetAndClearErrors, clearErrors } = useForm(emptyForm);

  function openCreate() {
    setEditing(null);
    resetAndClearErrors();
    setOpen(true);
  }

  function openEdit(row: KegiatanRow) {
    setEditing(row);
    setData({
      judul: row.judul ?? "",
      deskripsi: row.deskripsi ?? "",
      lokasi: row.lokasi ?? "",
      tanggal_mulai: String(row.tanggal_mulai ?? "").slice(0, 16),
      tanggal_selesai: String(row.tanggal_selesai ?? "").slice(0, 16),
    });
    clearErrors();
    setOpen(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      put(kegiatanUpdate.url({ id: editing.id }), { onSuccess: () => setOpen(false) });
    } else {
      post(kegiatanStore.url(), { onSuccess: () => setOpen(false) });
    }
  }

  function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    router.delete(kegiatanDestroy.url({ id: deleting.id }), {
      onSuccess: () => setDeleting(null),
      onFinish: () => setDeletingBusy(false),
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Jadwal Kegiatan" subtitle="Kelola kegiatan asrama" actions={<Button onClick={openCreate}>Tambah Kegiatan</Button>} />
      <Card>
        <Table
          columns={[
            { key: "judul", label: "Judul" },
            { key: "tanggal_mulai", label: "Mulai", render: (r: KegiatanRow) => String(r.tanggal_mulai ?? "").slice(0, 16).replace("T", " ") },
            { key: "lokasi", label: "Lokasi" },
            {
              key: "aksi",
              label: "",
              render: (r: KegiatanRow) => (
                <RowActions onDelete={() => setDeleting(r)} />
              ),
            },
          ]}
          data={kegiatan ?? []}
          emptyMessage="Belum ada kegiatan"
        />
      </Card>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Kegiatan" : "Tambah Kegiatan"}
        width="w-full max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" form="kegiatan-form" disabled={processing}>{processing ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        }
      >
        <form id="kegiatan-form" onSubmit={save} className="space-y-3">
          <FormField label="Judul"><input className={inputClass} value={data.judul} onChange={(e) => setData("judul", e.target.value)} required /></FormField>
          {errors.judul && <p className="text-sm text-error">{errors.judul}</p>}
          <FormField label="Lokasi"><input className={inputClass} value={data.lokasi} onChange={(e) => setData("lokasi", e.target.value)} /></FormField>
          <FormField label="Mulai"><input type="datetime-local" className={inputClass} value={data.tanggal_mulai} onChange={(e) => setData("tanggal_mulai", e.target.value)} required /></FormField>
          <FormField label="Selesai"><input type="datetime-local" className={inputClass} value={data.tanggal_selesai} onChange={(e) => setData("tanggal_selesai", e.target.value)} /></FormField>
          <FormField label="Deskripsi"><textarea className={inputClass} rows={3} value={data.deskripsi} onChange={(e) => setData("deskripsi", e.target.value)} /></FormField>
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