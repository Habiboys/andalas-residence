import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Card,
  Button,
  Drawer,
  DataTable,
  type DataColumn,
  FormField,
  inputClass,
  Tabs,
  TableSkeleton,
  Badge,
  ConfirmDialog,
} from "../../components/ui";
import { andalasApi } from "../../lib/api";

type Row = Record<string, unknown>;

interface Field {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea";
  options?: { value: string; label: string }[];
  optionsLoader?: () => Promise<Array<{ id?: string; name?: string; value?: string; label?: string }>>;
  required?: boolean;
}

interface SectionProps {
  title: string;
  subtitle: string;
  endpoint: string;
  columns: DataColumn<Row>[];
  fields: Field[];
  emptyMessage: string;
  rowLabel: (row: Row) => string;
  registerAdd?: (fn: () => void) => void;
}

function MasterCrudSection({ title, subtitle, endpoint, columns, fields, emptyMessage, rowLabel, registerAdd }: SectionProps) {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [optionMaps, setOptionMaps] = useState<Record<string, Array<{ value: string; label: string }>>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await andalasApi.get<Row[]>(endpoint);
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fields.forEach((f) => {
      if (f.optionsLoader) {
        f.optionsLoader()
          .then((rows) => {
            setOptionMaps((prev) => ({
              ...prev,
              [f.key]: rows.map((r) => ({ value: String(r.id ?? r.value ?? ""), label: r.label ?? r.name ?? "" })),
            }));
          })
          .catch(() => undefined);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    registerAdd?.(openCreate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerAdd]);

  function openCreate() {
    setEditing(null);
    const d: Record<string, unknown> = {};
    fields.forEach((f) => {
      if (f.options?.length) d[f.key] = f.options[0].value;
    });
    setForm(d);
    setOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    const d: Record<string, unknown> = {};
    fields.forEach((f) => {
      let v = row[f.key];
      if (v == null && f.key.endsWith("_id")) {
        const rel = row[f.key.replace("_id", "")] as { id?: string } | undefined;
        v = rel?.id;
      }
      d[f.key] = v ?? "";
    });
    setForm(d);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        await andalasApi.put(`${endpoint}/${String(editing.id)}`, form);
        toast.success(`${title} berhasil diperbarui.`);
      } else {
        await andalasApi.post(endpoint, form);
        toast.success(`${title} berhasil ditambahkan.`);
      }
      setOpen(false);
      await load();
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
      await andalasApi.delete(`${endpoint}/${String(deleting.id)}`);
      toast.success(`${title} berhasil dihapus.`);
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeletingBusy(false);
    }
  }

  const actionCol: DataColumn<Row> = {
    key: "aksi",
    label: "",
    render: (r) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => setDeleting(r)}>Hapus</Button>
      </div>
    ),
  };

  return (
    <Card>
      <div className="pt-4 px-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold text-primary dark:text-white">{title}</h3>
            <p className="text-xs text-muted dark:text-muted mt-0.5">{subtitle}</p>
          </div>
          <Button size="sm" onClick={openCreate}>Tambah</Button>
        </div>
      </div>

      {loading ? (
        <div className="p-4"><TableSkeleton /></div>
      ) : (
        <DataTable
          columns={[...columns, actionCol]}
          data={data}
          searchKeys={columns.map((c) => c.key)}
          emptyMessage={emptyMessage}
        />
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${title}` : `Tambah ${title}`}
        width="w-full max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" form="master-crud-form" disabled={busy}>Simpan</Button>
          </div>
        }
      >
        <form id="master-crud-form" onSubmit={save} className="space-y-3">
          {fields.map((f) => {
            const options = f.options ?? optionMaps[f.key] ?? [];
            return (
              <FormField key={f.key} label={f.label}>
                {f.type === "textarea" ? (
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.required}
                  />
                ) : f.type === "select" ? (
                  <select
                    className={`${inputClass} w-full`}
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.required}
                  >
                    <option value="">-- Pilih --</option>
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                    className={`${inputClass} w-full`}
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => setForm({ ...form, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
                    required={f.required}
                  />
                )}
              </FormField>
            );
          })}
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingBusy}
        title={`Hapus ${title}`}
        message={`Hapus ${title.toLowerCase()} "${rowLabel(deleting ?? {})}"? Tindakan ini tidak dapat dibatalkan.`}
      />
    </Card>
  );
}

const JENJANG = [
  { value: "D3", label: "D3" },
  { value: "D4", label: "D4" },
  { value: "S1", label: "S1" },
  { value: "S2", label: "S2" },
  { value: "S3", label: "S3" },
];

export default function MasterData() {
  const [tab, setTab] = useState(0);
  const addFns = useRef<Array<() => void>>([]);
  const registerAdd = (i: number) => (fn: () => void) => {
    addFns.current[i] = fn;
  };

  const loadFakultas = () => andalasApi.get<Array<{ id: string; name: string }>>("/api/andalas/master/fakultas");
  const loadDepartemen = () => andalasApi.get<Array<{ id: string; name: string }>>("/api/andalas/master/departemen");
  const loadProvinsi = () => andalasApi.get<Array<{ id: string; name: string }>>("/api/andalas/master/provinsi");

  const tabs: { label: string; section: ReactNode }[] = [
    {
      label: "Fakultas",
      section: (
        <MasterCrudSection
          title="Fakultas"
          subtitle="Unit akademik tingkat fakultas"
          endpoint="/api/andalas/master/fakultas"
          emptyMessage="Belum ada fakultas"
          rowLabel={(r) => String(r.name ?? "")}
          registerAdd={registerAdd(0)}
          fields={[{ key: "name", label: "Nama Fakultas", required: true }]}
          columns={[
            { key: "name", label: "Nama Fakultas", sortable: true },
            { key: "departemen_count", label: "Departemen" },
          ]}
        />
      ),
    },
    {
      label: "Departemen",
      section: (
        <MasterCrudSection
          title="Departemen"
          subtitle="Departemen di bawah fakultas"
          endpoint="/api/andalas/master/departemen"
          emptyMessage="Belum ada departemen"
          rowLabel={(r) => String(r.name ?? "")}
          registerAdd={registerAdd(1)}
          fields={[
            { key: "faculty_id", label: "Fakultas", type: "select", required: true, optionsLoader: loadFakultas },
            { key: "name", label: "Nama Departemen", required: true },
          ]}
          columns={[
            { key: "name", label: "Nama Departemen", sortable: true },
            {
              key: "faculty",
              label: "Fakultas",
              render: (r) => String((r.faculty as { name?: string } | undefined)?.name ?? "-"),
            },
            { key: "prodi_count", label: "Prodi" },
          ]}
        />
      ),
    },
    {
      label: "Prodi",
      section: (
        <MasterCrudSection
          title="Program Studi"
          subtitle="Program studi di bawah departemen"
          endpoint="/api/andalas/master/all-prodi"
          emptyMessage="Belum ada program studi"
          rowLabel={(r) => String(r.name ?? "")}
          registerAdd={registerAdd(2)}
          fields={[
            { key: "departemen_id", label: "Departemen", type: "select", required: true, optionsLoader: loadDepartemen },
            { key: "name", label: "Nama Prodi", required: true },
            { key: "jenjang", label: "Jenjang", type: "select", required: true, options: JENJANG },
          ]}
          columns={[
            { key: "name", label: "Nama Prodi", sortable: true },
            { key: "jenjang", label: "Jenjang" },
            {
              key: "departemen",
              label: "Departemen",
              render: (r) => String((r.departemen as { name?: string } | undefined)?.name ?? "-"),
            },
          ]}
        />
      ),
    },
    {
      label: "Periode",
      section: (
        <MasterCrudSection
          title="Periode"
          subtitle="Periode akademik asrama"
          registerAdd={registerAdd(3)}
          endpoint="/api/andalas/master/periode"
          emptyMessage="Belum ada periode"
          rowLabel={(r) => String(r.nama_periode ?? "")}
          fields={[
            { key: "nama_periode", label: "Nama Periode", required: true },
            { key: "status", label: "Status", type: "select", required: true, options: [
              { value: "aktif", label: "Aktif" },
              { value: "nonaktif", label: "Nonaktif" },
            ] },
            { key: "tanggal_mulai", label: "Tanggal Mulai", type: "date", required: true },
            { key: "tanggal_selesai", label: "Tanggal Selesai", type: "date", required: true },
          ]}
          columns={[
            { key: "nama_periode", label: "Nama Periode", sortable: true },
            { key: "status", label: "Status", render: (r) => <Badge color={(r.status as string) === "aktif" ? "green" : "gray"}>{String(r.status ?? "")}</Badge> },
            { key: "tanggal_mulai", label: "Mulai" },
            { key: "tanggal_selesai", label: "Selesai" },
          ]}
        />
      ),
    },
    {
      label: "Provinsi",
      section: (
        <MasterCrudSection
          title="Provinsi"
          subtitle="Provinsi asal mahasiswa"
          endpoint="/api/andalas/master/provinsi"
          emptyMessage="Belum ada provinsi"
          rowLabel={(r) => String(r.name ?? "")}
          registerAdd={registerAdd(4)}
          fields={[{ key: "name", label: "Nama Provinsi", required: true }]}
          columns={[
            { key: "name", label: "Nama Provinsi", sortable: true },
            { key: "cities_count", label: "Kota/Kabupaten" },
          ]}
        />
      ),
    },
    {
      label: "Kota",
      section: (
        <MasterCrudSection
          title="Kota / Kabupaten"
          subtitle="Kota/kabupaten di bawah provinsi"
          endpoint="/api/andalas/master/kota"
          emptyMessage="Belum ada kota"
          rowLabel={(r) => String(r.name ?? "")}
          registerAdd={registerAdd(5)}
          fields={[
            { key: "province_id", label: "Provinsi", type: "select", required: true, optionsLoader: loadProvinsi },
            { key: "name", label: "Nama Kota/Kabupaten", required: true },
          ]}
          columns={[
            { key: "name", label: "Nama Kota/Kabupaten", sortable: true },
            {
              key: "province",
              label: "Provinsi",
              render: (r) => String((r.province as { name?: string } | undefined)?.name ?? "-"),
            },
          ]}
        />
      ),
    },
    {
      label: "Kategori Transaksi",
      section: (
        <MasterCrudSection
          title="Kategori Transaksi"
          subtitle="Kategori pemasukan/pengeluaran keuangan"
          endpoint="/api/andalas/master/kategori"
          emptyMessage="Belum ada kategori transaksi"
          rowLabel={(r) => String(r.nama_kategori ?? "")}
          registerAdd={registerAdd(6)}
          fields={[
            { key: "nama_kategori", label: "Nama Kategori", required: true },
            { key: "tipe", label: "Tipe", type: "select", required: true, options: [
              { value: "pemasukan", label: "Pemasukan" },
              { value: "pengeluaran", label: "Pengeluaran" },
            ] },
            { key: "kode_rekening", label: "Kode Rekening" },
          ]}
          columns={[
            { key: "nama_kategori", label: "Nama Kategori", sortable: true },
            { key: "tipe", label: "Tipe", render: (r) => <Badge color={(r.tipe as string) === "pemasukan" ? "green" : "red"}>{String(r.tipe ?? "")}</Badge> },
            { key: "kode_rekening", label: "Kode Rekening", render: (r) => String(r.kode_rekening ?? "-") },
            { key: "transaksi_count", label: "Transaksi" },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Data Master"
        subtitle="Kelola data master sistem (superadmin)"
        actions={
          <Button onClick={() => addFns.current[tab]?.()}>Tambah {tabs[tab]?.label}</Button>
        }
      />
      <Card>
        <Tabs tabs={tabs.map((t) => t.label)} active={tab} onChange={setTab} />
        <div className="p-4">{tabs[tab]?.section}</div>
      </Card>
    </div>
  );
}
