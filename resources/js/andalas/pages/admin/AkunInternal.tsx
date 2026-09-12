import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Table, Button, Drawer, FormField, inputClass, Tabs, ConfirmDialog } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";
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

const ROLES = ["superadmin", "pimpinan", "staff_admin", "fasilitator", "teknisi"];
const emptyForm = { nim_nip: "", nama: "", email: "", password: "", no_hp: "", role: "staff_admin" };

export default function AkunInternal() {
  const { currentUser } = useAuth();
  const isSuperadmin = currentUser?.role === "superadmin" || currentUser?.raw_role === "superadmin";
  const { data: users, reload: reloadUsers } = useAndalasApi<UserRow[]>(isSuperadmin ? "/api/andalas/admin/users" : null);
  const { data: roles } = useAndalasApi<RoleRow[]>(isSuperadmin ? "/api/andalas/admin/roles" : null);
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  if (!isSuperadmin) {
    return (
      <div className="p-6">
        <PageHeader title="Akun & Role Internal" subtitle="Hanya superadmin yang dapat mengakses halaman ini" />
        <Card className="p-6 text-sm text-muted">Anda tidak memiliki akses ke modul ini.</Card>
      </div>
    );
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: UserRow) {
    setEditing(row);
    setForm({
      nim_nip: row.nim_nip ?? "",
      nama: row.nama ?? "",
      email: row.email ?? "",
      password: "",
      no_hp: "",
      role: row.roles?.[0] ?? "staff_admin",
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
        await andalasApi.put(`/api/andalas/admin/users/${editing.id}`, payload);
      } else {
        await andalasApi.post("/api/andalas/admin/users", form);
      }
      setOpen(false);
      await reloadUsers();
      toast.success(editing ? "Akun berhasil diperbarui." : "Akun berhasil ditambahkan.");
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
      await andalasApi.delete(`/api/andalas/admin/users/${deleting.id}`);
      toast.success("Akun berhasil dihapus.");
      setDeleting(null);
      await reloadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Akun & Role Internal"
        subtitle="Kelola akun staff dan hak akses (superadmin)"
        actions={<Button onClick={openCreate}>Tambah Akun</Button>}
      />

      <Card>
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
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleting(r)}>Hapus</Button>
                  </div>
                ),
              },
            ]}
            data={users ?? []}
            emptyMessage="Belum ada akun internal"
          />
        ) : (
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
            <Button type="submit" form="akun-internal-form" disabled={busy}>Simpan</Button>
          </div>
        }
      >
        <form id="akun-internal-form" onSubmit={save} className="space-y-3">
          <FormField label="NIP/NIM"><input className={inputClass} value={form.nim_nip} onChange={(e) => setForm({ ...form, nim_nip: e.target.value })} required /></FormField>
          <FormField label="Nama"><input className={inputClass} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required /></FormField>
          <FormField label="Email"><input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></FormField>
          <FormField label={editing ? "Password (kosongkan jika tidak diubah)" : "Password"}>
            <input type="password" className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
          </FormField>
          <FormField label="Role">
            <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
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
