import { useState } from "react";
import { useForm, router } from "@inertiajs/react";
import { PageHeader, Card, Table, Button, Drawer, FormField, inputClass, Tabs, ConfirmDialog, RowActions } from "../../components/ui";
import { store as usersStore, update as usersUpdate, destroy as usersDestroy } from "@/routes/andalas/admin/users";
import { useAuth } from "../../context/AppContext";

type UserRow = {
  id: string;
  nim_nip?: string;
  nama?: string;
  email?: string;
  status?: string;
  roles?: string[];
};

type RoleRow = { name: string; users_count: number };

type Props = { users: UserRow[] | null; roles: RoleRow[] | null };

const ROLES = ["superadmin", "pimpinan", "staff_admin", "fasilitator", "teknisi"];
const emptyForm = { nim_nip: "", nama: "", email: "", password: "", no_hp: "", role: "staff_admin" };

export default function AkunInternal({ users, roles }: Props) {
  const { currentUser } = useAuth();
  const isSuperadmin = currentUser?.role === "superadmin" || currentUser?.raw_role === "superadmin";
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const { data, setData, post, put, errors, processing, resetAndClearErrors, clearErrors } = useForm(emptyForm);

  if (!isSuperadmin) {
    return (
      <div className="space-y-4">
        <PageHeader title="Akun & Role Internal" subtitle="Hanya superadmin yang dapat mengakses halaman ini" />
        <Card className="p-6 text-sm text-muted">Anda tidak memiliki akses ke modul ini.</Card>
      </div>
    );
  }

  function openCreate() {
    setEditing(null);
    resetAndClearErrors();
    setOpen(true);
  }

  function openEdit(row: UserRow) {
    setEditing(row);
    setData({
      nim_nip: row.nim_nip ?? "",
      nama: row.nama ?? "",
      email: row.email ?? "",
      password: "",
      no_hp: "",
      role: row.roles?.[0] ?? "staff_admin",
    });
    clearErrors();
    setOpen(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      put(usersUpdate.url({ id: editing.id }), { onSuccess: () => setOpen(false) });
    } else {
      post(usersStore.url(), { onSuccess: () => setOpen(false) });
    }
  }

  function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    router.delete(usersDestroy.url({ id: deleting.id }), {
      onSuccess: () => setDeleting(null),
      onFinish: () => setDeletingBusy(false),
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Akun & Role Internal"
        subtitle="Kelola akun staff dan hak akses (superadmin)"
        actions={<Button onClick={openCreate}>Tambah Akun</Button>}
      />

      <Card className="p-4">
        <Tabs tabs={["Daftar Akun", "Ringkasan Role"]} active={tab} onChange={setTab} />
        {tab === 0 ? (
          <Table
            columns={[
              { key: "nim_nip", label: "NIP/NIM" },
              { key: "nama", label: "Nama" },
              { key: "email", label: "Email" },
              { key: "role", label: "Role", render: (r: UserRow) => r.roles?.[0] ?? "-" },
              { key: "status", label: "Status" },
              {
                key: "aksi",
                label: "",
                render: (r: UserRow) => (
                  <RowActions onEdit={() => openEdit(r)} onDelete={() => setDeleting(r)} />
                ),
              },
            ]}
            data={users ?? []}
            emptyMessage="Belum ada akun internal"
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(roles ?? []).map((r) => (
              <div key={r.name} className="rounded-box border border-base-300 bg-base-200 p-4">
                <p className="font-semibold capitalize">{r.name.replace("_", " ")}</p>
                <p className="text-sm text-muted">{r.users_count} pengguna</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Akun" : "Tambah Akun Internal"}
        width="w-full max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" form="akun-internal-form" disabled={processing}>{processing ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        }
      >
        <form id="akun-internal-form" onSubmit={save} className="space-y-3">
          <FormField label="NIP/NIM">
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
          <FormField label="Role">
            <select className={inputClass} value={data.role} onChange={(e) => setData("role", e.target.value)} required>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
            {errors.role && <p className="mt-1 text-sm text-error">{errors.role}</p>}
          </FormField>
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingBusy}
        title="Hapus Akun"
        message={`Hapus akun ${deleting?.nama ?? ""}? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}