import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Table, Button, FormField, inputClass, StatCard, ConfirmDialog } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";
import { formatRupiah } from "../../lib/format";

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
type DashboardStats = {
  saldo: number;
  pemasukan: number;
  pengeluaran: number;
  pembayaran_pending: number;
  pembayaran_lunas: number;
  jumlah_transaksi: number;
};

export default function Keuangan() {
  const { data: transaksi, reload } = useAndalasApi<TransaksiRow[]>("/api/andalas/keuangan");
  const { data: kategori } = useAndalasApi<KategoriRow[]>("/api/andalas/kategori-transaksi");
  const { data: stats } = useAndalasApi<DashboardStats>("/api/andalas/keuangan/dashboard");
  const [form, setForm] = useState({ kategori_id: "", tanggal_transaksi: "", nominal: "", deskripsi: "", tipe: "pemasukan" });
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<TransaksiRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, nominal: Number(form.nominal) };
      const wasEdit = !!editId;
      if (editId) {
        await andalasApi.put(`/api/andalas/transaksi-keuangan/${editId}`, payload);
        setEditId(null);
      } else {
        await andalasApi.post("/api/andalas/transaksi-keuangan", payload);
      }
      setForm({ kategori_id: "", tanggal_transaksi: "", nominal: "", deskripsi: "", tipe: "pemasukan" });
      await reload();
      toast.success(wasEdit ? "Transaksi berhasil diperbarui." : "Transaksi berhasil dicatat.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan transaksi");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await andalasApi.delete(`/api/andalas/transaksi-keuangan/${deleting.id}`);
      toast.success("Transaksi berhasil dihapus.");
      setDeleting(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeletingBusy(false);
    }
  }

  function startEdit(row: TransaksiRow) {
    setEditId(row.id);
    setForm({
      kategori_id: row.kategori?.id ?? "",
      tanggal_transaksi: String(row.tanggal_transaksi ?? "").slice(0, 10),
      nominal: String(row.nominal ?? ""),
      deskripsi: row.deskripsi ?? "",
      tipe: row.tipe ?? "pemasukan",
    });
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Keuangan" subtitle="Dashboard keuangan & buku besar kas operasional" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Saldo Kas" value={formatRupiah(Number(stats?.saldo ?? 0))} />
        <StatCard label="Total Pemasukan" value={formatRupiah(Number(stats?.pemasukan ?? 0))} />
        <StatCard label="Total Pengeluaran" value={formatRupiah(Number(stats?.pengeluaran ?? 0))} />
        <StatCard label="Pembayaran Pending" value={formatRupiah(Number(stats?.pembayaran_pending ?? 0))} />
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">{editId ? "Edit Transaksi" : "Catat Transaksi Baru"}</h3>
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
          <FormField label="Kategori">
            <select className={inputClass} value={form.kategori_id} onChange={(e) => setForm({ ...form, kategori_id: e.target.value })} required>
              <option value="">Pilih kategori</option>
              {(kategori ?? []).map((k) => <option key={k.id} value={k.id}>{k.nama_kategori} ({k.tipe})</option>)}
            </select>
          </FormField>
          <FormField label="Tipe">
            <select className={inputClass} value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })}>
              <option value="pemasukan">Pemasukan</option>
              <option value="pengeluaran">Pengeluaran</option>
            </select>
          </FormField>
          <FormField label="Tanggal"><input type="date" className={inputClass} value={form.tanggal_transaksi} onChange={(e) => setForm({ ...form, tanggal_transaksi: e.target.value })} required /></FormField>
          <FormField label="Nominal"><input type="number" className={inputClass} value={form.nominal} onChange={(e) => setForm({ ...form, nominal: e.target.value })} required /></FormField>
          <div className="md:col-span-2"><FormField label="Deskripsi"><input className={inputClass} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} /></FormField></div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{editId ? "Update" : "Simpan"}</Button>
            {editId && <Button type="button" variant="secondary" onClick={() => { setEditId(null); setForm({ kategori_id: "", tanggal_transaksi: "", nominal: "", deskripsi: "", tipe: "pemasukan" }); }}>Batal Edit</Button>}
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
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(r)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleting(r)}>Hapus</Button>
                </div>
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
        loading={deletingBusy}
        title="Hapus Transaksi"
        message={`Hapus transaksi ${deleting?.tipe ?? ""} ${deleting?.nominal ? formatRupiah(Number(deleting.nominal)) : ""} ini? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}
