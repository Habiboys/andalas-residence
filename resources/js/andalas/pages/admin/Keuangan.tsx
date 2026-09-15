import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { PageHeader, Card, Table, Button, FormField, inputClass, StatCard, ConfirmDialog, RowActions } from "../../components/ui";
import { store as transaksiStore, update as transaksiUpdate, destroy as transaksiDestroy } from "@/routes/andalas/keuangan";
import { formatRupiah } from "../../lib/format";
import type { KeuanganStats } from "../../lib/types";

type TransaksiRow = {
  id: string;
  nomor_bukti?: string;
  tanggal_transaksi?: string;
  nominal?: number;
  tipe?: string;
  deskripsi?: string;
  kategori?: { id?: string; nama_kategori?: string };
};
type KategoriRow = { id: string; nama_kategori?: string; tipe?: string };

export default function Keuangan({ transaksi = [], kategori = [], stats }: { transaksi?: TransaksiRow[]; kategori?: KategoriRow[]; stats?: KeuanganStats }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TransaksiRow | null>(null);
  const { data, setData, post, put, processing, errors, reset } = useForm({
    kategori_id: "",
    tanggal_transaksi: "",
    nominal: "",
    deskripsi: "",
    tipe: "pemasukan",
  });
  const deleteForm = useForm<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      put(transaksiUpdate.url({ id: editId }), {
        onSuccess: () => {
          setEditId(null);
          reset();
        },
      });
    } else {
      post(transaksiStore.url(), {
        onSuccess: () => reset(),
      });
    }
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteForm.delete(transaksiDestroy.url({ id: deleting.id }), {
      onSuccess: () => setDeleting(null),
    });
  }

  function startEdit(row: TransaksiRow) {
    setEditId(row.id);
    setData({
      kategori_id: row.kategori?.id ?? "",
      tanggal_transaksi: String(row.tanggal_transaksi ?? "").slice(0, 10),
      nominal: String(row.nominal ?? ""),
      deskripsi: row.deskripsi ?? "",
      tipe: row.tipe ?? "pemasukan",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Keuangan" subtitle="Dashboard keuangan & buku besar kas operasional" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Saldo Kas" value={formatRupiah(stats?.saldo ?? 0)} />
        <StatCard label="Total Pemasukan" value={formatRupiah(stats?.pemasukan ?? 0)} />
        <StatCard label="Total Pengeluaran" value={formatRupiah(stats?.pengeluaran ?? 0)} />
        <StatCard label="Pembayaran Pending" value={formatRupiah(stats?.pembayaran_pending ?? 0)} />
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">{editId ? "Edit Transaksi" : "Catat Transaksi Baru"}</h3>
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
          <FormField label="Kategori">
            <select className={inputClass} value={data.kategori_id} onChange={(e) => setData("kategori_id", e.target.value)} required>
              <option value="">Pilih kategori</option>
              {(kategori ?? []).map((k) => <option key={k.id} value={k.id}>{k.nama_kategori} ({k.tipe})</option>)}
            </select>
            {errors.kategori_id && <p className="mt-1 text-sm text-error">{errors.kategori_id}</p>}
          </FormField>
          <FormField label="Tipe">
            <select className={inputClass} value={data.tipe} onChange={(e) => setData("tipe", e.target.value)}>
              <option value="pemasukan">Pemasukan</option>
              <option value="pengeluaran">Pengeluaran</option>
            </select>
            {errors.tipe && <p className="mt-1 text-sm text-error">{errors.tipe}</p>}
          </FormField>
          <FormField label="Tanggal">
            <input type="date" className={inputClass} value={data.tanggal_transaksi} onChange={(e) => setData("tanggal_transaksi", e.target.value)} required />
            {errors.tanggal_transaksi && <p className="mt-1 text-sm text-error">{errors.tanggal_transaksi}</p>}
          </FormField>
          <FormField label="Nominal">
            <input type="number" className={inputClass} value={data.nominal} onChange={(e) => setData("nominal", e.target.value)} required />
            {errors.nominal && <p className="mt-1 text-sm text-error">{errors.nominal}</p>}
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Deskripsi">
              <input className={inputClass} value={data.deskripsi} onChange={(e) => setData("deskripsi", e.target.value)} />
              {errors.deskripsi && <p className="mt-1 text-sm text-error">{errors.deskripsi}</p>}
            </FormField>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={processing}>{editId ? "Update" : "Simpan"}</Button>
            {editId && <Button type="button" variant="secondary" onClick={() => { setEditId(null); reset(); }}>Batal Edit</Button>}
          </div>
        </form>
      </Card>

      <Card>
        <Table
          columns={[
            { key: "nomor_bukti", label: "No. Bukti" },
            { key: "tanggal", label: "Tanggal", render: (r: TransaksiRow) => String(r.tanggal_transaksi ?? "").slice(0, 10) },
            { key: "kategori", label: "Kategori", render: (r: TransaksiRow) => r.kategori?.nama_kategori ?? "-" },
            { key: "tipe", label: "Tipe" },
            { key: "nominal", label: "Nominal", render: (r: TransaksiRow) => formatRupiah(Number(r.nominal ?? 0)) },
            {
              key: "aksi",
              label: "",
              render: (r: TransaksiRow) => (
                <RowActions onEdit={() => startEdit(r)} onDelete={() => setDeleting(r)} />
              ),
            },
          ]}
          data={transaksi ?? []}
          emptyMessage="Belum ada transaksi"
        />
      </Card>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteForm.processing}
        title="Hapus Transaksi"
        message={`Hapus transaksi ${deleting?.tipe ?? ""} ${deleting?.nominal ? formatRupiah(Number(deleting.nominal)) : ""} ini? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}