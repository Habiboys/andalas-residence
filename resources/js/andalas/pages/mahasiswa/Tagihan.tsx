import { useState } from "react";
import { PageHeader, Card, StatusBadge, Table, Button, FormField, inputClass } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { andalasApi } from "../../lib/api";
import { formatRupiah, mapPaymentStatus } from "../../lib/format";
import { useAuth } from "../../context/AppContext";

type PembayaranRow = {
  id: string;
  jenis_pembayaran?: string;
  nominal?: number;
  metode_pembayaran?: string;
  status?: string;
  created_at?: string;
  termin_ke?: number;
};

export default function Tagihan() {
  const { currentUser } = useAuth();
  const { data: pembayaran, reload } = useAndalasApi<PembayaranRow[]>("/api/andalas/pembayaran");
  const rows = pembayaran ?? [];
  const [form, setForm] = useState({ jenis_pembayaran: "sewa_asrama", nominal: "1500000", termin_ke: "1", catatan: "" });
  const [bukti, setBukti] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const totalTagihan = rows.reduce((acc, p) => acc + Number(p.nominal ?? 0), 0);
  const totalLunas = rows.filter((p) => p.status === "lunas").reduce((acc, p) => acc + Number(p.nominal ?? 0), 0);
  const totalPending = rows.filter((p) => p.status === "menunggu_verifikasi").reduce((acc, p) => acc + Number(p.nominal ?? 0), 0);

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("jenis_pembayaran", form.jenis_pembayaran);
      fd.append("nominal", form.nominal);
      fd.append("termin_ke", form.termin_ke);
      fd.append("metode_pembayaran", "transfer_bank");
      if (form.catatan) fd.append("atas_nama_pengirim", form.catatan);
      if (bukti) fd.append("bukti_transfer", bukti);
      await andalasApi.post("/api/andalas/pembayaran", fd);
      setShowForm(false);
      setBukti(null);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: "termin", label: "Termin", render: (r: PembayaranRow) => `Termin ${r.termin_ke ?? 1}` },
    { key: "jenis_pembayaran", label: "Jenis" },
    { key: "nominal", label: "Jumlah", render: (r: PembayaranRow) => formatRupiah(Number(r.nominal ?? 0)) },
    { key: "metode_pembayaran", label: "Metode" },
    { key: "status", label: "Status", render: (r: PembayaranRow) => <StatusBadge status={mapPaymentStatus(r.status ?? "")} /> },
    { key: "created_at", label: "Tanggal", render: (r: PembayaranRow) => String(r.created_at ?? "").slice(0, 10) },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Tagihan & Pembayaran"
        subtitle="Ajukan pembayaran biaya hunian, diverifikasi admin"
        actions={<Button onClick={() => setShowForm(!showForm)}>{showForm ? "Tutup Form" : "Ajukan Pembayaran"}</Button>}
      />

      {showForm && (
        <Card className="p-6 mb-6">
          <h3 className="font-semibold mb-4">Form Pengajuan Pembayaran</h3>
          <p className="mb-4 text-sm text-muted">Integrasi VA akan ditambahkan. Saat ini admin akan memverifikasi pembayaran Anda.</p>
          <form onSubmit={submitPayment} className="grid md:grid-cols-2 gap-4">
            <FormField label="Jenis Pembayaran">
              <select className={inputClass} value={form.jenis_pembayaran} onChange={(e) => setForm({ ...form, jenis_pembayaran: e.target.value })}>
                <option value="sewa_asrama">Sewa Asrama</option>
                <option value="cicilan">Cicilan</option>
                <option value="denda_kerusakan">Denda Kerusakan</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </FormField>
            <FormField label="Termin"><input type="number" min={1} className={inputClass} value={form.termin_ke} onChange={(e) => setForm({ ...form, termin_ke: e.target.value })} /></FormField>
            <FormField label="Nominal (Rp)"><input type="number" className={inputClass} value={form.nominal} onChange={(e) => setForm({ ...form, nominal: e.target.value })} required /></FormField>
            <FormField label="Atas Nama / Catatan"><input className={inputClass} value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></FormField>
            <FormField label="Bukti Transfer (opsional)">
              <input type="file" accept="image/*,.pdf" onChange={(e) => setBukti(e.target.files?.[0] ?? null)} className="file-input w-full" />
            </FormField>
            <div className="md:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Mengirim..." : "Kirim Pengajuan"}</Button></div>
          </form>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="mb-1 text-xs uppercase text-muted">Total Tagihan</p><p className="text-lg font-bold">{formatRupiah(totalTagihan)}</p></Card>
        <Card className="p-4"><p className="mb-1 text-xs uppercase text-muted">Total Lunas</p><p className="text-lg font-bold text-success">{formatRupiah(totalLunas)}</p></Card>
        <Card className="p-4"><p className="mb-1 text-xs uppercase text-muted">Menunggu Verifikasi</p><p className="text-lg font-bold text-warning">{formatRupiah(totalPending)}</p></Card>
      </div>
      <Card>
        <div className="border-b border-base-300 px-5 py-4"><h2 className="text-sm font-semibold">Daftar Pembayaran</h2><p className="text-xs text-muted">NIM {currentUser?.nim}</p></div>
        <Table columns={columns} data={rows} emptyMessage="Belum ada riwayat pembayaran" />
      </Card>
    </div>
  );
}
