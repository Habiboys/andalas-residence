import { useState } from "react";
import { useForm, router } from "@inertiajs/react";
import { PageHeader, Card, DataTable, StatusBadge, Button, Drawer, FormField, inputClass, ConfirmDialog, RowActions } from "../../components/ui";
import { store as asetStore, update as asetUpdate, destroy as asetDestroy } from "@/routes/andalas/aset";

type AsetRow = {
  id: string;
  kode_inventaris?: string;
  nama_aset?: string;
  kategori?: string;
  kondisi?: string;
  kamar?: { id?: string; nomor_kamar?: string };
};
type KamarOption = { id: string; nomor_kamar?: string; lantai?: { gedung?: { kode_gedung?: string } } };
type GedungRow = { lantai?: Array<{ kamar?: KamarOption[] }> };

type Props = { aset: AsetRow[]; gedung: GedungRow[] };

const emptyForm = { kode_inventaris: "", nama_aset: "", kategori: "", kondisi: "baik", kamar_id: "", nilai_aset: "" };

export default function KelolaAset({ aset, gedung }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AsetRow | null>(null);
  const [deleting, setDeleting] = useState<AsetRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const { data, setData, post, put, transform, errors, processing, resetAndClearErrors, clearErrors } = useForm(emptyForm);

  const kamarOptions = (gedung ?? []).flatMap((g) => (g.lantai ?? []).flatMap((l) => l.kamar ?? []));

  function openCreate() {
    setEditing(null);
    resetAndClearErrors();
    setOpen(true);
  }

  function openEdit(row: AsetRow) {
    setEditing(row);
    setData({
      kode_inventaris: row.kode_inventaris ?? "",
      nama_aset: row.nama_aset ?? "",
      kategori: row.kategori ?? "",
      kondisi: row.kondisi ?? "baik",
      kamar_id: row.kamar?.id ?? "",
      nilai_aset: "",
    });
    clearErrors();
    setOpen(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    transform((form) => ({
      ...form,
      kamar_id: form.kamar_id || null,
      nilai_aset: form.nilai_aset ? Number(form.nilai_aset) : null,
    }));
    if (editing) {
      put(asetUpdate.url({ id: editing.id }), { onSuccess: () => setOpen(false) });
    } else {
      post(asetStore.url(), { onSuccess: () => setOpen(false) });
    }
  }

  function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    router.delete(asetDestroy.url({ id: deleting.id }), {
      onSuccess: () => setDeleting(null),
      onFinish: () => setDeletingBusy(false),
    });
  }

  const columns = [
    { key: "kode_inventaris", label: "Kode" },
    { key: "nama_aset", label: "Nama Aset" },
    { key: "kategori", label: "Kategori" },
    { key: "kamar", label: "Kamar", render: (r: AsetRow) => r.kamar?.nomor_kamar ?? "Umum" },
    { key: "kondisi", label: "Kondisi", render: (r: AsetRow) => <StatusBadge status={r.kondisi ?? "baik"} />, filter: { type: "select", options: ["baik", "rusak_ringan", "rusak_berat", "hilang"] } },
    {
      key: "aksi",
      label: "",
      render: (r: AsetRow) => (
        <RowActions onEdit={() => openEdit(r)} onDelete={() => setDeleting(r)} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Kelola Aset" subtitle="Inventaris aset asrama" actions={<Button onClick={openCreate}>Tambah Aset</Button>} />
      <Card className="p-4">
        <DataTable columns={columns as never} data={(aset ?? []) as never} />
      </Card>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Aset" : "Tambah Aset"}
        width="w-full max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" form="kelola-aset-form" disabled={processing}>{processing ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        }
      >
        <form id="kelola-aset-form" onSubmit={save} className="space-y-3">
          <FormField label="Kode Inventaris"><input className={inputClass} value={data.kode_inventaris} onChange={(e) => setData("kode_inventaris", e.target.value)} required /></FormField>
          {errors.kode_inventaris && <p className="text-sm text-error">{errors.kode_inventaris}</p>}
          <FormField label="Nama Aset"><input className={inputClass} value={data.nama_aset} onChange={(e) => setData("nama_aset", e.target.value)} required /></FormField>
          {errors.nama_aset && <p className="text-sm text-error">{errors.nama_aset}</p>}
          <FormField label="Kategori"><input className={inputClass} value={data.kategori} onChange={(e) => setData("kategori", e.target.value)} required /></FormField>
          {errors.kategori && <p className="text-sm text-error">{errors.kategori}</p>}
          <FormField label="Kamar">
            <select className={inputClass} value={data.kamar_id} onChange={(e) => setData("kamar_id", e.target.value)}>
              <option value="">Fasilitas Umum</option>
              {kamarOptions.map((k) => <option key={k.id} value={k.id}>Kamar {k.nomor_kamar}</option>)}
            </select>
            {errors.kamar_id && <p className="text-sm text-error">{errors.kamar_id}</p>}
          </FormField>
          <FormField label="Kondisi">
            <select className={inputClass} value={data.kondisi} onChange={(e) => setData("kondisi", e.target.value)}>
              <option value="baik">Baik</option>
              <option value="rusak_ringan">Rusak Ringan</option>
              <option value="rusak_berat">Rusak Berat</option>
              <option value="hilang">Hilang</option>
            </select>
            {errors.kondisi && <p className="text-sm text-error">{errors.kondisi}</p>}
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