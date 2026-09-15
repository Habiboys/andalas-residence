import { useState } from "react";
import { useForm, router } from "@inertiajs/react";
import { PageHeader, Card, DataTable, Button, Drawer, FormField, inputClass, ConfirmDialog, RowActions } from "../../components/ui";
import { store as mahasiswaStore, update as mahasiswaUpdate, destroy as mahasiswaDestroy } from "@/routes/andalas/mahasiswa";

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

type Props = { mahasiswa: MhsRow[]; prodi: ProdiRow[]; periode: PeriodeRow[] };

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

export default function DataMahasiswa({ mahasiswa, prodi, periode }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MhsRow | null>(null);
  const [deleting, setDeleting] = useState<MhsRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const { data, setData, post, put, errors, processing, resetAndClearErrors, clearErrors } = useForm(emptyForm);

  function openCreate() {
    setEditing(null);
    resetAndClearErrors();
    setOpen(true);
  }

  function openEdit(row: MhsRow) {
    setEditing(row);
    setData({
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
    clearErrors();
    setOpen(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      put(mahasiswaUpdate.url({ id: editing.id }), { onSuccess: () => setOpen(false) });
    } else {
      post(mahasiswaStore.url(), { onSuccess: () => setOpen(false) });
    }
  }

  function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    router.delete(mahasiswaDestroy.url({ id: deleting.id }), {
      onSuccess: () => setDeleting(null),
      onFinish: () => setDeletingBusy(false),
    });
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
        <RowActions onEdit={() => openEdit(r)} onDelete={() => setDeleting(r)} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Data Mahasiswa"
        subtitle="Kelola data mahasiswa penghuni asrama"
        actions={<Button onClick={openCreate}>Tambah Mahasiswa</Button>}
      />
      <Card className="p-4">
        <DataTable columns={columns as never} data={(mahasiswa ?? []) as never} searchKeys={["angkatan", "status_huni"]} />
      </Card>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Mahasiswa" : "Tambah Mahasiswa"}
        width="w-full max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" form="mahasiswa-form" disabled={processing}>{processing ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        }
      >
        <form id="mahasiswa-form" onSubmit={save} className="space-y-3">
          <FormField label="NIM">
            <input className={inputClass} value={data.nim_nip} onChange={(e) => setData("nim_nip", e.target.value)} required />
            {errors.nim_nip && <p className="mt-1 text-sm text-error">{errors.nim_nip}</p>}
          </FormField>
          <FormField label="Nama">
            <input className={inputClass} value={data.nama} onChange={(e) => setData("nama", e.target.value)} required />
            {errors.nama && <p className="mt-1 text-sm text-error">{errors.nama}</p>}
          </FormField>
          <FormField label="Email">
            <input type="email" className={inputClass} value={data.email} onChange={(e) => setData("email", e.target.value)} required />
            {errors.email && <p className="mt-1 text-sm text-error">{errors.email}</p>}
          </FormField>
          <FormField label={editing ? "Password (kosongkan jika tidak diubah)" : "Password"}>
            <input type="password" className={inputClass} value={data.password} onChange={(e) => setData("password", e.target.value)} required={!editing} />
            {errors.password && <p className="mt-1 text-sm text-error">{errors.password}</p>}
          </FormField>
          <FormField label="Prodi">
            <select className={inputClass} value={data.prodi_id} onChange={(e) => setData("prodi_id", e.target.value)} required>
              <option value="">Pilih prodi</option>
              {(prodi ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.prodi_id && <p className="mt-1 text-sm text-error">{errors.prodi_id}</p>}
          </FormField>
          <FormField label="Periode">
            <select className={inputClass} value={data.periode_id} onChange={(e) => setData("periode_id", e.target.value)} required>
              <option value="">Pilih periode</option>
              {(periode ?? []).map((p) => <option key={p.id} value={p.id}>{p.nama_periode}</option>)}
            </select>
            {errors.periode_id && <p className="mt-1 text-sm text-error">{errors.periode_id}</p>}
          </FormField>
          <FormField label="Angkatan">
            <input className={inputClass} value={data.angkatan} onChange={(e) => setData("angkatan", e.target.value)} required />
            {errors.angkatan && <p className="mt-1 text-sm text-error">{errors.angkatan}</p>}
          </FormField>
          <FormField label="Status Huni">
            <select className={inputClass} value={data.status_huni} onChange={(e) => setData("status_huni", e.target.value)}>
              <option value="calon">Calon</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
              <option value="keluar">Keluar</option>
            </select>
            {errors.status_huni && <p className="mt-1 text-sm text-error">{errors.status_huni}</p>}
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